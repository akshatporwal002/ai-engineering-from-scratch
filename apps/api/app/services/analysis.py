"""Deterministic CV-analysis state machine over fake providers."""

from uuid import UUID

from pydantic import SecretStr

from app.core.errors import ApiError
from app.domain.models import AnalysisInput, AnalysisJobView
from app.providers.fake import AnalysisProvider
from app.repositories.memory import DeterministicClock, DeterministicIds, MemoryRepositories

TRANSITIONS = {"uploaded": {"processing"}, "processing": {"complete", "failed"}, "complete": set(), "failed": set()}


def transition(current: str, target: str) -> str:
    if target not in TRANSITIONS.get(current, set()):
        raise ApiError("invalid_request", f"Illegal document transition: {current} to {target}.", 409)
    return target


class AnalysisService:
    def __init__(self, repository: MemoryRepositories, clock: DeterministicClock, ids: DeterministicIds, provider: AnalysisProvider) -> None:
        self.repository, self.clock, self.ids, self.provider = repository, clock, ids, provider

    async def run(self, user_id: UUID, document_id: UUID, model: str, request: AnalysisInput, *, provider: AnalysisProvider | None = None, secret: SecretStr | None = None) -> AnalysisJobView:
        document = await self.repository.get_document(user_id, document_id)
        if document is None:
            raise ApiError("document_not_found", "The CV document was not found.", 404)
        document.status = transition(document.status, "processing")  # type: ignore[arg-type]
        await self.repository.put_document(user_id, document)
        job = AnalysisJobView(id=self.ids.next(), document_id=document_id, status="pending", created_at=self.clock.now())
        try:
            job.result = await (provider or self.provider).analyze_cv(secret or SecretStr("fake-fixture-key"), model, request)
            job.status = "complete"
            document.status = transition(document.status, "complete")  # type: ignore[arg-type]
        except ApiError as error:
            job.status, job.error_code = "failed", error.code
            document.status = transition(document.status, "failed")  # type: ignore[arg-type]
            document.processing_error_code = error.code
        await self.repository.put_document(user_id, document)
        await self.repository.put_analysis(user_id, job)
        return job
