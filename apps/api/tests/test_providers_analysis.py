import unittest
from uuid import UUID

from pydantic import SecretStr

from app.core.errors import ApiError
from app.domain.models import AnalysisInput, CvDocumentCreate, ProviderId, SaveProviderConnection
from app.providers.fake import ERRORS, FakeOutcome, FakeProvider, provider_for, validate_model
from app.repositories.memory import DeterministicClock, DeterministicIds, MemoryRepositories
from app.services.analysis import AnalysisService, transition
from app.services.documents import DocumentService
from app.services.providers import ProviderConnectionService


class ProviderAndAnalysisTests(unittest.IsolatedAsyncioTestCase):
    async def test_all_fake_failure_classes_are_safe_and_deterministic(self):
        request = AnalysisInput(cv_text="Synthetic CV content long enough for the current one hundred and twenty character minimum. This is deterministic fixture material only.", target_role="Engineer")
        for outcome in FakeOutcome:
            provider = FakeProvider(outcome)
            if outcome == FakeOutcome.SUCCESS:
                self.assertEqual((await provider.analyze_cv(SecretStr("fake-key"), "model", request)).readiness_score, 72)
            else:
                with self.assertRaises(ApiError) as caught:
                    await provider.analyze_cv(SecretStr("fake-key"), "model", request)
                self.assertEqual(caught.exception.code, ERRORS[outcome][0])

    def test_registry_and_model_allowlists_are_closed(self):
        self.assertIsInstance(provider_for(ProviderId.OPENAI), FakeProvider)
        self.assertEqual(validate_model(ProviderId.OPENAI, "gpt-5-mini"), "gpt-5-mini")
        with self.assertRaises(ApiError): validate_model(ProviderId.OPENAI, "user-controlled-model")

    async def test_connection_never_returns_secret_and_model_update_reuses_it(self):
        repository, user = MemoryRepositories(), UUID(int=1)
        service = ProviderConnectionService(repository, DeterministicClock(), DeterministicIds())
        item = await service.save(user, SaveProviderConnection(provider_id="openai", model_id="gpt-5-mini", credential="fake-super-secret"))
        self.assertEqual(item.key_hint, "••••cret")
        self.assertNotIn("credential", item.model_dump())
        self.assertEqual((await service.update_model(user, item.id, "gpt-5-mini")).id, item.id)
        await service.delete(user, item.id)
        self.assertEqual(await service.list(user), [])

    def test_state_machine_accepts_only_legal_transitions(self):
        self.assertEqual(transition("uploaded", "processing"), "processing")
        self.assertEqual(transition("processing", "complete"), "complete")
        with self.assertRaises(ApiError): transition("complete", "processing")

    async def test_workflow_completes_with_five_dimensions_and_nine_signals(self):
        repository, clock, ids, user = MemoryRepositories(), DeterministicClock(), DeterministicIds(), UUID(int=1)
        text = "Synthetic resume text that is sufficiently long for the current one hundred and twenty character minimum. It is fake fixture content only."
        document = await DocumentService(repository, clock, ids).create(user, CvDocumentCreate(filename="resume.txt", mime_type="text/plain", content=text.encode(), target_role="Engineer", consent=True))
        job = await AnalysisService(repository, clock, ids, FakeProvider()).run(user, document.id, "gpt-5-mini", AnalysisInput(cv_text=text, target_role="Engineer"))
        self.assertEqual(job.status, "complete")
        self.assertEqual(len(job.result.dimensions), 5)
        self.assertEqual(len(job.result.career_signals), 9)
        self.assertEqual([item.id for item in job.result.dimensions], ["role-alignment", "evidence", "impact", "skills", "clarity"])
        self.assertEqual([item.id for item in job.result.career_signals], ["decision-velocity", "authority-gap", "narrative-scarcity", "authority-signal", "seniority-perception", "operational-roi", "governance", "observability", "scalability"])
        self.assertEqual((await repository.get_document(user, document.id)).status, "complete")

    async def test_workflow_persists_safe_failure_without_provider_detail(self):
        repository, clock, ids, user = MemoryRepositories(), DeterministicClock(), DeterministicIds(), UUID(int=1)
        text = "Synthetic resume text that is sufficiently long for the current one hundred and twenty character minimum. It is fake fixture content only."
        document = await DocumentService(repository, clock, ids).create(user, CvDocumentCreate(filename="resume.txt", mime_type="text/plain", content=text.encode(), target_role="Engineer", consent=True))
        job = await AnalysisService(repository, clock, ids, FakeProvider(FakeOutcome.TIMEOUT)).run(user, document.id, "gpt-5-mini", AnalysisInput(cv_text=text, target_role="Engineer"))
        self.assertEqual((job.status, job.error_code), ("failed", "provider_timeout"))
        self.assertIsNone(job.result)


if __name__ == "__main__":
    unittest.main()
