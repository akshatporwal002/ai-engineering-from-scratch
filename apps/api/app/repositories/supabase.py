"""Request-scoped Supabase adapters preserving RLS and private Vault boundaries."""

import base64
import binascii
import hashlib
from datetime import UTC, datetime
from typing import Any
from urllib.parse import quote
from uuid import UUID, uuid4

import httpx
from pydantic import SecretStr

from app.core.config import Settings
from app.core.errors import ApiError
from app.domain.models import AnalysisCreate, AnalysisInput, AnalysisJobView, AnalysisResult, CvDocumentCreate, CvDocumentDetail, CvDocumentView, LessonProgress, Page, ProgressState, ProviderConnectionView, ProviderId, SaveProviderConnection
from app.providers.http import production_provider, validate_model
from app.services.documents import validate_document
from app.services.extraction import extract_text_bounded
from app.services.progress import reconcile_progress


class SupabaseGateway:
    def __init__(self, settings: Settings, access_token: str) -> None:
        self.settings, self.access_token = settings, access_token
        self.root = settings.supabase_url.rstrip("/")

    def _headers(self, *, service: bool = False, prefer: str | None = None) -> dict[str, str]:
        key = self.settings.supabase_service_role_key.get_secret_value() if service else self.settings.supabase_publishable_key.get_secret_value()
        token = key if service else self.access_token
        headers = {"apikey": key, "authorization": f"Bearer {token}", "content-type": "application/json"}
        if prefer:
            headers["prefer"] = prefer
        return headers

    async def request(self, method: str, path: str, *, service: bool = False, json: Any = None, content: bytes | None = None, headers: dict[str, str] | None = None, prefer: str | None = None) -> httpx.Response:
        merged = {**self._headers(service=service, prefer=prefer), **(headers or {})}
        try:
            async with httpx.AsyncClient(timeout=20, follow_redirects=False) as client:
                response = await client.request(method, f"{self.root}{path}", headers=merged, json=json, content=content)
        except httpx.TimeoutException as error:
            raise ApiError("storage_timeout", "Account storage did not respond in time.", 504) from error
        except httpx.HTTPError as error:
            raise ApiError("storage_unavailable", "Account storage is temporarily unavailable.", 503) from error
        if not response.is_success:
            if response.status_code in {401, 403}:
                raise ApiError("authentication_required", "Sign in again to continue.", 401)
            if response.status_code == 404:
                raise ApiError("document_not_found", "The requested account record was not found.", 404)
            if response.status_code == 409:
                raise ApiError("request_conflict", "The account record changed. Refresh and try again.", 409)
            raise ApiError("storage_unavailable", "Account storage could not complete the request.", 503)
        return response

    async def rows(self, method: str, path: str, **kwargs: Any) -> list[dict[str, Any]]:
        response = await self.request(method, path, **kwargs)
        if response.status_code == 204 or not response.content:
            return []
        value = response.json()
        return value if isinstance(value, list) else [value]


def _dt(value: str | datetime | None) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat((value or datetime.now(UTC).isoformat()).replace("Z", "+00:00"))


def _document(row: dict[str, Any]) -> CvDocumentView:
    return CvDocumentView(id=row["id"], filename=row["original_filename"], mime_type=row["mime_type"], size_bytes=row["byte_size"], status=row["status"], created_at=_dt(row["created_at"]), processing_error_code=row.get("processing_error_code"))


def _connection(row: dict[str, Any]) -> ProviderConnectionView:
    return ProviderConnectionView(id=row["id"], provider_id=row["provider"], model_id=row["model"], key_hint=row["key_hint"], created_at=_dt(row["created_at"]))


def _analysis_result(value: dict[str, Any]) -> AnalysisResult:
    """Accept both the FastAPI contract and analyses written by the legacy edge API."""
    if "readiness_score" in value:
        return AnalysisResult.model_validate(value)
    return AnalysisResult.model_validate({
        "readiness_score": value.get("roleReadinessScore"),
        "dimensions": value.get("dimensions", []),
        "career_signals": value.get("careerSignals", []),
        "strengths": value.get("strengths", []),
        "gaps": value.get("missingSkills", []),
        "recommendations": value.get("improvementPlan", []),
        "rewrites": [item.get("replacement", "") for item in value.get("suggestions", []) if isinstance(item, dict) and item.get("replacement")],
        "lesson_suggestions": [],
    })


class SupabaseRepositories:
    def __init__(self, gateway: SupabaseGateway) -> None:
        self.gateway = gateway

    async def list_progress(self, user_id: UUID) -> list[LessonProgress]:
        rows = await self.gateway.rows("GET", f"/rest/v1/lesson_progress?user_id=eq.{user_id}&select=lesson_path,answers,completed_at,completion_updated_at,visited_at")
        return [LessonProgress(lesson_path=row["lesson_path"], answers=row.get("answers") or {}, completed=row.get("completed_at") is not None, completion_changed_at=row.get("completion_updated_at"), visited_at=row.get("visited_at")) for row in rows]

    async def replace_progress(self, user_id: UUID, rows: list[LessonProgress]) -> None:
        payload = [{"user_id": str(user_id), "lesson_path": row.lesson_path, "answers": {key: value.model_dump(mode="json") for key, value in row.answers.items()}, "completed_at": row.completion_changed_at.isoformat() if row.completed and row.completion_changed_at else None, "completion_updated_at": row.completion_changed_at.isoformat() if row.completion_changed_at else None, "visited_at": row.visited_at.isoformat() if row.visited_at else None} for row in rows]
        if payload:
            await self.gateway.request("POST", "/rest/v1/lesson_progress?on_conflict=user_id,lesson_path", json=payload, prefer="resolution=merge-duplicates,return=minimal")


class SupabaseProviderService:
    def __init__(self, gateway: SupabaseGateway, user_id: UUID, timeout: float) -> None:
        self.gateway, self.user_id, self.timeout = gateway, user_id, timeout

    async def list(self, _user_id: UUID) -> list[ProviderConnectionView]:
        rows = await self.gateway.rows("GET", f"/rest/v1/ai_provider_connections?user_id=eq.{self.user_id}&select=id,provider,key_hint,model,created_at&order=created_at.desc")
        return [_connection(row) for row in rows]

    async def save(self, _user_id: UUID, command: SaveProviderConnection) -> ProviderConnectionView:
        model = validate_model(command.provider_id, command.model_id)
        provider = production_provider(command.provider_id, self.timeout)
        await provider.verify_key(command.credential, model)
        raw = command.credential.get_secret_value()
        existing = await self.gateway.rows("GET", f"/rest/v1/ai_provider_connections?user_id=eq.{self.user_id}&provider=eq.{command.provider_id.value}&select=id,provider,display_name,key_hint,model,verified_at", service=True)
        item_id = UUID(existing[0]["id"]) if existing else uuid4()
        display = {ProviderId.GEMINI: "Google Gemini", ProviderId.OPENAI: "OpenAI", ProviderId.ANTHROPIC: "Anthropic"}[command.provider_id]
        rows = await self.gateway.rows("POST", "/rest/v1/ai_provider_connections?on_conflict=user_id,provider&select=id,provider,key_hint,model,created_at", service=True, prefer="resolution=merge-duplicates,return=representation", json={"id": str(item_id), "user_id": str(self.user_id), "provider": command.provider_id.value, "display_name": display, "key_hint": f"••••{raw[-4:]}", "model": model, "verified_at": datetime.now(UTC).isoformat()})
        if not rows:
            raise ApiError("storage_unavailable", "The provider connection could not be saved.", 503)
        item = _connection(rows[0])
        try:
            await self.gateway.request("POST", "/rest/v1/rpc/codeology_store_provider_secret", service=True, json={"p_user_id": str(self.user_id), "p_connection_id": str(item.id), "p_secret": raw})
        except ApiError:
            if existing:
                previous = existing[0]
                await self.gateway.request("PATCH", f"/rest/v1/ai_provider_connections?id=eq.{item.id}&user_id=eq.{self.user_id}", service=True, prefer="return=minimal", json={key: previous[key] for key in ("display_name", "key_hint", "model", "verified_at")})
            else:
                await self.gateway.request("DELETE", f"/rest/v1/ai_provider_connections?id=eq.{item.id}&user_id=eq.{self.user_id}", service=True)
            raise ApiError("provider_storage_unavailable", "The verified credential could not be stored securely.", 503)
        return item

    async def _get(self, item_id: UUID) -> ProviderConnectionView:
        rows = await self.gateway.rows("GET", f"/rest/v1/ai_provider_connections?id=eq.{item_id}&user_id=eq.{self.user_id}&select=id,provider,key_hint,model,created_at", service=True)
        if not rows:
            raise ApiError("provider_not_connected", "The provider connection was not found.", 404)
        return _connection(rows[0])

    async def secret(self, item_id: UUID) -> SecretStr:
        await self._get(item_id)
        response = await self.gateway.request("POST", "/rest/v1/rpc/codeology_read_provider_secret", service=True, json={"p_user_id": str(self.user_id), "p_connection_id": str(item_id)})
        raw = response.json()
        if not isinstance(raw, str) or not raw:
            raise ApiError("provider_not_connected", "Connect this provider again before analysis.", 404)
        return SecretStr(raw)

    async def update_model(self, _user_id: UUID, item_id: UUID, model: str) -> ProviderConnectionView:
        item, secret = await self._get(item_id), await self.secret(item_id)
        model = validate_model(item.provider_id, model)
        await production_provider(item.provider_id, self.timeout).verify_key(secret, model)
        rows = await self.gateway.rows("PATCH", f"/rest/v1/ai_provider_connections?id=eq.{item_id}&user_id=eq.{self.user_id}&select=id,provider,key_hint,model,created_at", service=True, prefer="return=representation", json={"model": model, "verified_at": datetime.now(UTC).isoformat()})
        if not rows:
            raise ApiError("provider_not_connected", "The provider connection was not found.", 404)
        return _connection(rows[0])

    async def delete(self, _user_id: UUID, item_id: UUID) -> None:
        await self._get(item_id)
        await self.gateway.request("POST", "/rest/v1/rpc/codeology_delete_provider_secret", service=True, json={"p_user_id": str(self.user_id), "p_connection_id": str(item_id)})
        await self.gateway.request("DELETE", f"/rest/v1/ai_provider_connections?id=eq.{item_id}&user_id=eq.{self.user_id}", service=True)


class SupabaseDocumentService:
    def __init__(self, gateway: SupabaseGateway, user_id: UUID) -> None:
        self.gateway, self.user_id = gateway, user_id

    async def create(self, _user_id: UUID, command: CvDocumentCreate) -> CvDocumentView:
        if command.content_base64 is not None:
            if command.content is not None or command.pasted_text is not None:
                raise ApiError("invalid_request", "Provide exactly one CV source.", 422)
            try:
                decoded = base64.b64decode(command.content_base64, validate=True)
            except (binascii.Error, ValueError) as error:
                raise ApiError("file_signature_invalid", "The uploaded file encoding is invalid.", 422) from error
            command = command.model_copy(update={"content": decoded, "content_base64": None})
        validation_command = command if command.content is None else command.model_copy(update={"extracted_text": "validated during bounded server extraction " * 4})
        filename, text = validate_document(validation_command)
        content = command.content if command.content is not None else text.encode("utf-8")
        if command.content is not None:
            text = await extract_text_bounded(filename, command.mime_type, content)
        item_id = uuid4()
        storage_path = f"{self.user_id}/{item_id}/{quote(filename, safe='._-')}"
        await self.gateway.request("POST", f"/storage/v1/object/cv-documents/{storage_path}", content=content, headers={"content-type": command.mime_type, "x-upsert": "false"})
        try:
            rows = await self.gateway.rows("POST", "/rest/v1/cv_documents?select=*", prefer="return=representation", json={"id": str(item_id), "user_id": str(self.user_id), "storage_path": storage_path, "original_filename": filename, "mime_type": command.mime_type, "byte_size": len(content), "content_sha256": hashlib.sha256(content).hexdigest(), "source_kind": "pasted" if command.pasted_text is not None else "upload", "target_role": command.target_role, "job_description": command.job_description, "provider_consent_at": datetime.now(UTC).isoformat()})
        except ApiError:
            try:
                await self.gateway.request("DELETE", f"/storage/v1/object/cv-documents/{storage_path}")
            except ApiError:
                pass
            raise
        if not rows:
            try:
                await self.gateway.request("DELETE", f"/storage/v1/object/cv-documents/{storage_path}")
            except ApiError:
                pass
            raise ApiError("storage_unavailable", "The CV document record could not be saved.", 503)
        return _document(rows[0])

    async def _row(self, item_id: UUID) -> dict[str, Any]:
        rows = await self.gateway.rows("GET", f"/rest/v1/cv_documents?id=eq.{item_id}&user_id=eq.{self.user_id}&select=*")
        if not rows:
            raise ApiError("document_not_found", "The CV document was not found.", 404)
        return rows[0]

    async def list(self, _user_id: UUID, offset: int, limit: int) -> Page:
        response = await self.gateway.request("GET", f"/rest/v1/cv_documents?user_id=eq.{self.user_id}&select=*&order=created_at.desc&offset={offset}&limit={limit}", headers={"prefer": "count=exact"})
        rows = response.json()
        total = int(response.headers.get("content-range", "0-0/0").rsplit("/", 1)[-1].replace("*", "0"))
        return Page(items=[_document(row) for row in rows], offset=offset, limit=limit, total=total)

    async def get(self, _user_id: UUID, item_id: UUID) -> CvDocumentView:
        return _document(await self._row(item_id))

    async def detail(self, _user_id: UUID, item_id: UUID) -> CvDocumentDetail:
        row = await self._row(item_id)
        analyses = await self.gateway.rows("GET", f"/rest/v1/cv_analyses?cv_document_id=eq.{item_id}&user_id=eq.{self.user_id}&select=id,cv_document_id,analysis,created_at&order=created_at.desc")
        jobs = [AnalysisJobView(id=value["id"], document_id=value["cv_document_id"], status="complete", created_at=_dt(value["created_at"]), result=_analysis_result(value["analysis"])) for value in analyses]
        return CvDocumentDetail(document=_document(row), analyses=jobs)

    async def content_and_context(self, item_id: UUID) -> tuple[dict[str, Any], str]:
        row = await self._row(item_id)
        response = await self.gateway.request("GET", f"/storage/v1/object/authenticated/cv-documents/{row['storage_path']}", headers={"content-type": "application/octet-stream"})
        return row, await extract_text_bounded(row["original_filename"], row["mime_type"], response.content)

    async def status(self, item_id: UUID, status: str, error: str | None = None) -> None:
        await self.gateway.request("PATCH", f"/rest/v1/cv_documents?id=eq.{item_id}&user_id=eq.{self.user_id}", json={"status": status, "processing_error_code": error}, prefer="return=minimal")

    async def delete(self, _user_id: UUID, item_id: UUID) -> None:
        row = await self._row(item_id)
        try:
            await self.gateway.request("DELETE", f"/storage/v1/object/cv-documents/{row['storage_path']}")
        except ApiError as error:
            if error.code != "document_not_found":
                raise
        await self.gateway.request("DELETE", f"/rest/v1/cv_documents?id=eq.{item_id}&user_id=eq.{self.user_id}", service=True)


class SupabaseAnalysisService:
    def __init__(self, gateway: SupabaseGateway, user_id: UUID, documents: SupabaseDocumentService, providers: SupabaseProviderService) -> None:
        self.gateway, self.user_id, self.documents, self.providers = gateway, user_id, documents, providers

    async def run(self, _user_id: UUID, document_id: UUID, _model: str, request: AnalysisCreate, *, idempotency_key: str | None = None) -> AnalysisJobView:
        if idempotency_key:
            prior = await self.gateway.rows("GET", f"/rest/v1/cv_analyses?user_id=eq.{self.user_id}&cv_document_id=eq.{document_id}&idempotency_key=eq.{idempotency_key}&select=id,cv_document_id,analysis,created_at", service=True)
            if prior:
                value = prior[0]
                return AnalysisJobView(id=value["id"], document_id=value["cv_document_id"], status="complete", created_at=_dt(value["created_at"]), result=_analysis_result(value["analysis"]))
        connection, secret = await self.providers._get(request.connection_id), await self.providers.secret(request.connection_id)
        row, text = await self.documents.content_and_context(document_id)
        await self.documents.status(document_id, "processing")
        job_id, created = uuid4(), datetime.now(UTC)
        try:
            provider_input = AnalysisInput(cv_text=text, target_role=row["target_role"], job_description=row["job_description"])
            result = await production_provider(connection.provider_id, self.providers.timeout).analyze_cv(secret, connection.model_id, provider_input)
            score = result.readiness_score
            label = "strong" if score >= 85 else "competitive" if score >= 70 else "developing" if score >= 45 else "early"
            await self.gateway.request("POST", "/rest/v1/cv_analyses", service=True, prefer="return=minimal", json={"id": str(job_id), "user_id": str(self.user_id), "cv_document_id": str(document_id), "provider_connection_id": str(connection.id), "provider": connection.provider_id.value, "model": connection.model_id, "schema_version": 1, "role_readiness_score": score, "role_readiness_label": label, "analysis": result.model_dump(mode="json"), "idempotency_key": idempotency_key})
            await self.documents.status(document_id, "complete")
            return AnalysisJobView(id=job_id, document_id=document_id, status="complete", created_at=created, result=result)
        except ApiError as error:
            if error.code == "request_conflict" and idempotency_key:
                prior = await self.gateway.rows("GET", f"/rest/v1/cv_analyses?user_id=eq.{self.user_id}&cv_document_id=eq.{document_id}&idempotency_key=eq.{idempotency_key}&select=id,cv_document_id,analysis,created_at", service=True)
                if prior:
                    value = prior[0]
                    await self.documents.status(document_id, "complete")
                    return AnalysisJobView(id=value["id"], document_id=value["cv_document_id"], status="complete", created_at=_dt(value["created_at"]), result=_analysis_result(value["analysis"]))
            await self.documents.status(document_id, "failed", error.code)
            return AnalysisJobView(id=job_id, document_id=document_id, status="failed", created_at=created, error_code=error.code)


class SupabaseApplication:
    def __init__(self, settings: Settings, access_token: str, user_id: UUID) -> None:
        gateway = SupabaseGateway(settings, access_token)
        self.repositories = SupabaseRepositories(gateway)
        self.providers = SupabaseProviderService(gateway, user_id, settings.provider_timeout_seconds)
        self.documents = SupabaseDocumentService(gateway, user_id)
        self.analyses = SupabaseAnalysisService(gateway, user_id, self.documents, self.providers)

    async def reconcile(self, user_id: UUID, state: ProgressState) -> ProgressState:
        return await reconcile_progress(self.repositories, user_id, state)
