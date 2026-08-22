"""Dependency-injection factory for the isolated in-memory application."""

from dataclasses import dataclass

from app.providers.fake import FakeProvider
from app.repositories.memory import DeterministicClock, DeterministicIds, MemoryRepositories
from app.services.analysis import AnalysisService
from app.services.documents import DocumentService
from app.services.providers import ProviderConnectionService


@dataclass
class Application:
    repositories: MemoryRepositories
    documents: DocumentService
    analyses: AnalysisService
    providers: ProviderConnectionService


def create_application() -> Application:
    repositories, clock, ids = MemoryRepositories(), DeterministicClock(), DeterministicIds()
    return Application(repositories, DocumentService(repositories, clock, ids), AnalysisService(repositories, clock, ids, FakeProvider()), ProviderConnectionService(repositories, clock, ids))
