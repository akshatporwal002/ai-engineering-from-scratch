"""Ownership-scoped in-memory adapters for deterministic tests and demos."""

from collections import defaultdict
from datetime import UTC, datetime, timedelta
from uuid import UUID

from pydantic import SecretStr

from app.domain.models import AnalysisJobView, CvDocumentView, LessonProgress, ProviderConnectionView


class DeterministicClock:
    def __init__(self, start: datetime | None = None) -> None:
        self.current = start or datetime(2026, 1, 1, tzinfo=UTC)

    def now(self) -> datetime:
        value = self.current
        self.current += timedelta(seconds=1)
        return value


class DeterministicIds:
    def __init__(self) -> None:
        self.value = 0

    def next(self) -> UUID:
        self.value += 1
        return UUID(int=self.value)


class MemoryRepositories:
    def __init__(self) -> None:
        self.progress: dict[UUID, list[LessonProgress]] = defaultdict(list)
        self.connections: dict[tuple[UUID, UUID], ProviderConnectionView] = {}
        self.credentials: dict[tuple[UUID, UUID], SecretStr] = {}
        self.documents: dict[tuple[UUID, UUID], CvDocumentView] = {}
        self.analyses: dict[tuple[UUID, UUID], AnalysisJobView] = {}
        self.objects: dict[tuple[UUID, UUID], bytes] = {}

    async def list_progress(self, user_id: UUID) -> list[LessonProgress]:
        return [row.model_copy(deep=True) for row in self.progress[user_id]]

    async def replace_progress(self, user_id: UUID, rows: list[LessonProgress]) -> None:
        self.progress[user_id] = [row.model_copy(deep=True) for row in rows]

    async def list_connections(self, user_id: UUID) -> list[ProviderConnectionView]:
        return sorted((value for (owner, _), value in self.connections.items() if owner == user_id), key=lambda item: (item.created_at, str(item.id)), reverse=True)

    async def put_connection(self, user_id: UUID, value: ProviderConnectionView) -> None:
        self.connections[(user_id, value.id)] = value.model_copy(deep=True)

    async def get_connection(self, user_id: UUID, item_id: UUID) -> ProviderConnectionView | None:
        value = self.connections.get((user_id, item_id))
        return value.model_copy(deep=True) if value else None

    async def delete_connection(self, user_id: UUID, item_id: UUID) -> None:
        self.connections.pop((user_id, item_id), None)

    async def put_credential(self, user_id: UUID, item_id: UUID, value: SecretStr) -> None:
        self.credentials[(user_id, item_id)] = value

    async def get_credential(self, user_id: UUID, item_id: UUID) -> SecretStr | None:
        return self.credentials.get((user_id, item_id))

    async def delete_credential(self, user_id: UUID, item_id: UUID) -> None:
        self.credentials.pop((user_id, item_id), None)

    async def put_document(self, user_id: UUID, value: CvDocumentView) -> None:
        self.documents[(user_id, value.id)] = value.model_copy(deep=True)

    async def get_document(self, user_id: UUID, item_id: UUID) -> CvDocumentView | None:
        value = self.documents.get((user_id, item_id))
        return value.model_copy(deep=True) if value else None

    async def list_documents(self, user_id: UUID, offset: int, limit: int) -> tuple[list[CvDocumentView], int]:
        rows = sorted((value for (owner, _), value in self.documents.items() if owner == user_id), key=lambda item: (item.created_at, str(item.id)), reverse=True)
        return [row.model_copy(deep=True) for row in rows[offset:offset + limit]], len(rows)

    async def delete_document(self, user_id: UUID, item_id: UUID) -> None:
        self.documents.pop((user_id, item_id), None)

    async def put_object(self, user_id: UUID, item_id: UUID, value: bytes) -> None:
        self.objects[(user_id, item_id)] = bytes(value)

    async def get_object(self, user_id: UUID, item_id: UUID) -> bytes | None:
        value = self.objects.get((user_id, item_id))
        return bytes(value) if value is not None else None

    async def delete_object(self, user_id: UUID, item_id: UUID) -> None:
        self.objects.pop((user_id, item_id), None)

    async def put_analysis(self, user_id: UUID, value: AnalysisJobView) -> None:
        self.analyses[(user_id, value.id)] = value.model_copy(deep=True)

    async def list_analyses(self, user_id: UUID, document_id: UUID) -> list[AnalysisJobView]:
        return sorted((value.model_copy(deep=True) for (owner, _), value in self.analyses.items() if owner == user_id and value.document_id == document_id), key=lambda item: (item.created_at, str(item.id)), reverse=True)
