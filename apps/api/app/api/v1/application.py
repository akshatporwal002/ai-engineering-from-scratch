"""HTTP adapters for the pure in-memory application services."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Header, Query, Request, Response

from app.application import Application
from app.core.auth import Principal, bearer_token
from app.core.errors import ApiError
from app.domain.models import AnalysisCreate, AnalysisInput, AnalysisJobView, CvDocumentCreate, CvDocumentDetail, CvDocumentView, Page, ProgressState, ProviderConnectionView, ProviderModelUpdate, SaveProviderConnection
from app.providers.fake import outcome_for_secret, provider_for
from app.services.progress import reconcile_progress
from app.repositories.supabase import SupabaseApplication

router = APIRouter()
FIXTURE_USER = UUID("00000000-0000-0000-0000-000000000001")


async def context(request: Request) -> tuple[Application | SupabaseApplication, Principal]:
    settings = request.app.state.settings
    if settings.adapter == "memory":
        return request.app.state.application, Principal(FIXTURE_USER, "fixture")
    token = bearer_token(request)
    principal = await request.app.state.authenticator.verify(token)
    return SupabaseApplication(settings, token, principal.user_id), principal


@router.post("/progress/reconcile", response_model=ProgressState)
async def reconcile(body: ProgressState, request: Request) -> ProgressState:
    app, principal = await context(request)
    if isinstance(app, SupabaseApplication):
        return await app.reconcile(principal.user_id, body)
    return await reconcile_progress(app.repositories, principal.user_id, body)


@router.get("/providers", response_model=list[ProviderConnectionView])
async def providers(request: Request) -> list[ProviderConnectionView]:
    app, principal = await context(request)
    return await app.providers.list(principal.user_id)


@router.post("/providers", response_model=ProviderConnectionView, status_code=201)
async def save_provider(body: SaveProviderConnection, request: Request) -> ProviderConnectionView:
    app, principal = await context(request)
    return await app.providers.save(principal.user_id, body)


@router.patch("/providers/{connection_id}/model", response_model=ProviderConnectionView)
async def update_provider_model(connection_id: UUID, body: ProviderModelUpdate, request: Request) -> ProviderConnectionView:
    app, principal = await context(request)
    return await app.providers.update_model(principal.user_id, connection_id, body.model_id)


@router.delete("/providers/{connection_id}", status_code=204)
async def delete_provider(connection_id: UUID, request: Request) -> Response:
    app, principal = await context(request)
    await app.providers.delete(principal.user_id, connection_id)
    return Response(status_code=204)


@router.post("/cv/documents", response_model=CvDocumentView, status_code=201)
async def create_document(body: CvDocumentCreate, request: Request) -> CvDocumentView:
    app, principal = await context(request)
    return await app.documents.create(principal.user_id, body)


@router.get("/cv/documents", response_model=Page)
async def list_documents(request: Request, offset: Annotated[int, Query(ge=0)] = 0, limit: Annotated[int, Query(ge=1, le=100)] = 50) -> Page:
    app, principal = await context(request)
    return await app.documents.list(principal.user_id, offset, limit)


@router.get("/cv/documents/{document_id}", response_model=CvDocumentDetail)
async def get_document(document_id: UUID, request: Request) -> CvDocumentDetail:
    app, principal = await context(request)
    return await app.documents.detail(principal.user_id, document_id)


@router.post("/cv/documents/{document_id}/analyses", response_model=AnalysisJobView, status_code=201)
async def analyze(document_id: UUID, body: AnalysisCreate, request: Request, idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key", min_length=8, max_length=128, pattern=r"^[A-Za-z0-9._:-]+$")] = None) -> AnalysisJobView:
    app, principal = await context(request)
    if isinstance(app, SupabaseApplication):
        return await app.analyses.run(principal.user_id, document_id, "", body, idempotency_key=idempotency_key)
    connection = await app.repositories.get_connection(principal.user_id, body.connection_id)
    if connection is None:
        raise ApiError("provider_not_connected", "Connect a provider before running analysis.", 404)
    secret = await app.repositories.get_credential(principal.user_id, connection.id)
    if secret is None:
        raise ApiError("provider_not_connected", "Connect a provider before running analysis.", 404)
    provider = provider_for(connection.provider_id, outcome_for_secret(secret))
    fixture_input = AnalysisInput(cv_text=body.cv_text, target_role=body.target_role, job_description=body.job_description)
    return await app.analyses.run(principal.user_id, document_id, connection.model_id, fixture_input, provider=provider, secret=secret)


@router.delete("/cv/documents/{document_id}", status_code=204)
async def delete_document(document_id: UUID, request: Request) -> Response:
    app, principal = await context(request)
    await app.documents.delete(principal.user_id, document_id)
    return Response(status_code=204)
