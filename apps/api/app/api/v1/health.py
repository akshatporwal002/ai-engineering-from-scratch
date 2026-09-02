"""Liveness, configuration readiness, and version endpoints."""

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
    settings = request.app.state.settings
    status = "ready" if settings.adapter == "memory" or (settings.supabase_url and settings.supabase_publishable_key.get_secret_value() and settings.supabase_service_role_key.get_secret_value()) else "not_ready"
    return envelope(request, status, settings)


@router.get("/version")
async def version(request: Request) -> dict[str, str]:
    return envelope(request, "version", request.app.state.settings)
