"""Health endpoints expose no external dependency state in the experiment."""

from fastapi import APIRouter, Request

from app.core.config import Settings

router = APIRouter(tags=["health"])


def envelope(request: Request, status: str, settings: Settings) -> dict[str, str]:
    return {"code": "ok", "message": status, "request_id": request.state.request_id, "version": settings.version}


@router.get("/health")
async def health(request: Request) -> dict[str, str]:
    return envelope(request, "healthy", request.app.state.settings)


@router.get("/readiness")
async def readiness(request: Request) -> dict[str, str]:
    return envelope(request, "ready", request.app.state.settings)


@router.get("/version")
async def version(request: Request) -> dict[str, str]:
    return envelope(request, "version", request.app.state.settings)
