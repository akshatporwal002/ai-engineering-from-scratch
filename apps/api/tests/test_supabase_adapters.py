"""Production-adapter tests that do not contact Supabase or an AI provider."""

from datetime import UTC, datetime
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, patch
from uuid import UUID, uuid4

from pydantic import SecretStr

from app.core.errors import ApiError
from app.domain.models import AnalysisResult, CvDocumentCreate, ProviderConnectionView, ProviderId, SaveProviderConnection
from app.repositories.supabase import SupabaseAnalysisService, SupabaseDocumentService, SupabaseProviderService, _analysis_result


class FakeGateway:
    def __init__(self, existing_id: UUID | None = None) -> None:
        self.existing_id = existing_id
        self.calls: list[tuple[str, str, dict]] = []

    async def rows(self, method: str, path: str, **kwargs):
        self.calls.append((method, path, kwargs))
        if method == "GET" and "ai_provider_connections" in path:
            return [{"id": str(self.existing_id)}] if self.existing_id else []
        if method == "POST" and "ai_provider_connections" in path:
            payload = kwargs["json"]
            return [{
                "id": payload["id"],
                "provider": payload["provider"],
                "key_hint": payload["key_hint"],
                "model": payload["model"],
                "created_at": datetime.now(UTC).isoformat(),
            }]
        return []

    async def request(self, method: str, path: str, **kwargs):
        self.calls.append((method, path, kwargs))
        return None


class SupabaseAdapterTests(IsolatedAsyncioTestCase):
    async def test_provider_key_rotation_preserves_connection_identity(self) -> None:
        user_id, connection_id = uuid4(), uuid4()
        gateway = FakeGateway(existing_id=connection_id)
        service = SupabaseProviderService(gateway, user_id, 10)
        verifier = AsyncMock()
        with patch("app.repositories.supabase.production_provider", return_value=verifier):
            saved = await service.save(user_id, SaveProviderConnection(
                provider_id=ProviderId.OPENAI,
                model_id="gpt-5.4-mini",
                credential=SecretStr("sk-test-credential-long-enough"),
            ))
        self.assertEqual(saved.id, connection_id)
        upsert = next(call for call in gateway.calls if call[0] == "POST" and "ai_provider_connections" in call[1])
        self.assertEqual(upsert[2]["json"]["id"], str(connection_id))
        self.assertFalse(any(call[0] == "DELETE" for call in gateway.calls))
        verifier.verify_key.assert_awaited_once()

    async def test_document_lookup_always_filters_by_authenticated_owner(self) -> None:
        user_id, document_id = uuid4(), uuid4()
        gateway = FakeGateway()
        service = SupabaseDocumentService(gateway, user_id)
        with self.assertRaises(ApiError) as caught:
            await service.get(user_id, document_id)
        self.assertEqual(caught.exception.code, "document_not_found")
        self.assertIn(f"id=eq.{document_id}&user_id=eq.{user_id}", gateway.calls[0][1])

    async def test_malformed_base64_is_rejected_before_storage(self) -> None:
        user_id = uuid4()
        gateway = FakeGateway()
        service = SupabaseDocumentService(gateway, user_id)
        command = CvDocumentCreate(
            filename="resume.pdf",
            mime_type="application/pdf",
            content_base64="not-base64!",
            target_role="AI Engineer",
            consent=True,
        )
        with self.assertRaises(ApiError) as caught:
            await service.create(user_id, command)
        self.assertEqual(caught.exception.code, "file_signature_invalid")
        self.assertEqual(gateway.calls, [])

    def test_legacy_edge_analysis_is_normalized_for_nextjs(self) -> None:
        dimension_ids = ["role-alignment", "evidence", "impact", "skills", "clarity"]
        signal_ids = ["decision-velocity", "authority-gap", "narrative-scarcity", "authority-signal", "seniority-perception", "operational-roi", "governance", "observability", "scalability"]
        result = _analysis_result({
            "roleReadinessScore": 73,
            "dimensions": [{"id": value, "label": value, "score": 70, "rationale": "CV evidence."} for value in dimension_ids],
            "careerSignals": [{"id": value, "label": value, "score": 65, "finding": "CV evidence."} for value in signal_ids],
            "strengths": ["Clear evidence"],
            "missingSkills": ["More outcomes"],
            "improvementPlan": ["Quantify impact"],
            "suggestions": [{"replacement": "Improved bullet"}],
        })
        self.assertEqual(result.readiness_score, 73)
        self.assertEqual(result.gaps, ["More outcomes"])
        self.assertEqual(result.rewrites, ["Improved bullet"])

    async def test_analysis_retry_returns_saved_result_before_provider_use(self) -> None:
        user_id, document_id, analysis_id = uuid4(), uuid4(), uuid4()
        dimension_ids = ["role-alignment", "evidence", "impact", "skills", "clarity"]
        signal_ids = ["decision-velocity", "authority-gap", "narrative-scarcity", "authority-signal", "seniority-perception", "operational-roi", "governance", "observability", "scalability"]
        payload = {
            "readiness_score": 81,
            "dimensions": [{"id": value, "label": value, "score": 80, "rationale": "CV evidence."} for value in dimension_ids],
            "career_signals": [{"id": value, "label": value, "score": 70, "finding": "CV evidence."} for value in signal_ids],
            "strengths": ["Evidence"], "gaps": ["Detail"], "recommendations": ["Quantify"],
            "rewrites": [], "lesson_suggestions": [],
        }

        class PriorGateway(FakeGateway):
            async def rows(self, method: str, path: str, **kwargs):
                self.calls.append((method, path, kwargs))
                return [{"id": str(analysis_id), "cv_document_id": str(document_id), "analysis": payload, "created_at": datetime.now(UTC).isoformat()}]

        gateway = PriorGateway()
        documents, providers = AsyncMock(), AsyncMock()
        service = SupabaseAnalysisService(gateway, user_id, documents, providers)
        result = await service.run(user_id, document_id, "", AsyncMock(), idempotency_key="retry-key-123")
        self.assertEqual(result.id, analysis_id)
        self.assertEqual(result.result.readiness_score, 81)
        providers._get.assert_not_awaited()

    async def test_concurrent_idempotent_insert_returns_winning_result(self) -> None:
        user_id, document_id, connection_id, analysis_id = uuid4(), uuid4(), uuid4(), uuid4()
        dimension_ids = ["role-alignment", "evidence", "impact", "skills", "clarity"]
        signal_ids = ["decision-velocity", "authority-gap", "narrative-scarcity", "authority-signal", "seniority-perception", "operational-roi", "governance", "observability", "scalability"]
        payload = {
            "readiness_score": 81,
            "dimensions": [{"id": value, "label": value, "score": 80, "rationale": "CV evidence."} for value in dimension_ids],
            "career_signals": [{"id": value, "label": value, "score": 70, "finding": "CV evidence."} for value in signal_ids],
            "strengths": ["Evidence"], "gaps": ["Detail"], "recommendations": ["Quantify"],
            "rewrites": [], "lesson_suggestions": [],
        }

        class RacingGateway(FakeGateway):
            def __init__(self) -> None:
                super().__init__()
                self.lookup_count = 0

            async def rows(self, method: str, path: str, **kwargs):
                self.calls.append((method, path, kwargs))
                if method == "GET" and "cv_analyses" in path:
                    self.lookup_count += 1
                    return [] if self.lookup_count == 1 else [{"id": str(analysis_id), "cv_document_id": str(document_id), "analysis": payload, "created_at": datetime.now(UTC).isoformat()}]
                return []

            async def request(self, method: str, path: str, **kwargs):
                self.calls.append((method, path, kwargs))
                if method == "POST" and path == "/rest/v1/cv_analyses":
                    raise ApiError("request_conflict", "Conflict", 409)

        gateway = RacingGateway()
        documents = AsyncMock()
        documents.content_and_context.return_value = ({"target_role": "AI Engineer", "job_description": "Build reliable AI systems and APIs."}, "Experienced AI engineer delivering reliable production systems with measurable outcomes, cross-functional leadership, and secure platform operations." * 2)
        providers = AsyncMock()
        providers.timeout = 10
        providers._get.return_value = ProviderConnectionView(id=connection_id, provider_id=ProviderId.OPENAI, model_id="gpt-5.4-mini", key_hint="••••1234", created_at=datetime.now(UTC))
        providers.secret.return_value = SecretStr("sk-test")
        generated = AnalysisResult.model_validate(payload)
        adapter = AsyncMock()
        adapter.analyze_cv.return_value = generated
        service = SupabaseAnalysisService(gateway, user_id, documents, providers)
        with patch("app.repositories.supabase.production_provider", return_value=adapter):
            result = await service.run(user_id, document_id, "", AsyncMock(connection_id=connection_id), idempotency_key="same-request-123")
        self.assertEqual(result.id, analysis_id)
        self.assertEqual(result.status, "complete")
        documents.status.assert_awaited_with(document_id, "complete")
