"""Application factory for the isolated FastAPI migration foundation."""

from time import perf_counter
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.router import router
from app.core.config import Settings, get_settings
from app.core.errors import ApiError, safe_error
from app.core.logging import log_event
from app.core.request_id import request_id_from


def create_app(settings: Settings | None = None) -> FastAPI:
    """Construct the local API with safe envelopes, logs, and request context."""

    app = FastAPI(title="Codeology API experiment", version=(settings or get_settings()).version)
    app.state.settings = settings or get_settings()

    @app.middleware("http")
    async def request_context(request: Request, call_next: Any) -> Any:
        request.state.request_id = request_id_from(request.headers.get("x-request-id"))
        started = perf_counter()
        response = await call_next(request)
        response.headers["x-request-id"] = request.state.request_id
        log_event("request.completed", request_id=request.state.request_id, method=request.method, path=request.url.path, status_code=response.status_code, latency_ms=round((perf_counter() - started) * 1000, 2))
        return response

    @app.exception_handler(ApiError)
    async def api_error_handler(request: Request, error: ApiError) -> JSONResponse:
        return JSONResponse(status_code=error.status_code, content=safe_error(error.code, error.message, request.state.request_id, details=error.details))

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, _error: RequestValidationError) -> JSONResponse:
        return JSONResponse(status_code=422, content=safe_error("invalid_request", "Request validation failed.", request.state.request_id))

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(request: Request, error: StarletteHTTPException) -> JSONResponse:
        code = "route_not_found" if error.status_code == 404 else "http_error"
        message = "Route not found." if error.status_code == 404 else "Request could not be completed."
        return JSONResponse(status_code=error.status_code, content=safe_error(code, message, request.state.request_id))

    app.include_router(router)
    return app


app = create_app()
