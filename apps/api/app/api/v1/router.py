"""Versioned router kept free of application business logic."""

from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.application import router as application_router

router = APIRouter(prefix="/api/v1")
router.include_router(health_router)
router.include_router(application_router)
