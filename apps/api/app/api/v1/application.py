"""HTTP adapters for the pure in-memory application services."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Request, Response

from app.application import Application
from app.core.errors import ApiError
from app.domain.models import AnalysisCreate, AnalysisJobView, CvDocumentCreate, CvDocumentDetail, CvDocumentView, Page, ProgressState, ProviderConnectionView, ProviderModelUpdate, SaveProviderConnection
from app.providers.fake import outcome_for_secret, provider_for
from app.services.progress import reconcile_progress

router = APIRouter()
FIXTURE_USER = UUID("00000000-0000-0000-0000-000000000001")


def application(request: Request) -> Application:
    return request.app.state.application


@router.post("/progress/reconcile", response_model=ProgressState)
async def reconcile(body: ProgressState, request: Request) -> ProgressState:
    return await reconcile_progress(application(request).repositories, FIXTURE_USER, body)


@router.get("/providers", response_model=list[ProviderConnectionView])
async def providers(request: Request) -> list[ProviderConnectionView]:
    return await application(request).providers.list(FIXTURE_USER)


@router.post("/providers", response_model=ProviderConnectionView, status_code=201)
async def save_provider(body: SaveProviderConnection, request: Request) -> ProviderConnectionView:
    return await application(request).providers.save(FIXTURE_USER, body)


@router.patch("/providers/{connection_id}/model", response_model=ProviderConnectionView)
async def update_provider_model(connection_id: UUID, body: ProviderModelUpdate, request: Request) -> ProviderConnectionView:
    return await application(request).providers.update_model(FIXTURE_USER, connection_id, body.model_id)


@router.delete("/providers/{connection_id}", status_code=204)
async def delete_provider(connection_id: UUID, request: Request) -> Response:
    await application(request).providers.delete(FIXTURE_USER, connection_id)
    return Response(status_code=204)


@router.post("/cv/documents", response_model=CvDocumentView, status_code=201)
async def create_document(body: CvDocumentCreate, request: Request) -> CvDocumentView:
    return await application(request).documents.create(FIXTURE_USER, body)


@router.get("/cv/documents", response_model=Page)
async def list_documents(request: Request, offset: Annotated[int, Query(ge=0)] = 0, limit: Annotated[int, Query(ge=1, le=100)] = 50) -> Page:
    return await application(request).documents.list(FIXTURE_USER, offset, limit)


@router.get("/cv/documents/{document_id}", response_model=CvDocumentDetail)
async def get_document(document_id: UUID, request: Request) -> CvDocumentDetail:
    return await application(request).documents.detail(FIXTURE_USER, document_id)


@router.post("/cv/documents/{document_id}/analyses", response_model=AnalysisJobView, status_code=201)
async def analyze(document_id: UUID, body: AnalysisCreate, request: Request) -> AnalysisJobView:
    app = application(request)
    connection = await app.repositories.get_connection(FIXTURE_USER, body.connection_id)
    if connection is None:
        raise ApiError("provider_not_connected", "Connect a provider before running analysis.", 404)
    secret = await app.repositories.get_credential(FIXTURE_USER, connection.id)
    if secret is None:
        raise ApiError("provider_not_connected", "Connect a provider before running analysis.", 404)
    provider = provider_for(connection.provider_id, outcome_for_secret(secret))
    return await app.analyses.run(FIXTURE_USER, document_id, connection.model_id, body, provider=provider, secret=secret)


@router.delete("/cv/documents/{document_id}", status_code=204)
async def delete_document(document_id: UUID, request: Request) -> Response:
    await application(request).documents.delete(FIXTURE_USER, document_id)
    return Response(status_code=204)
