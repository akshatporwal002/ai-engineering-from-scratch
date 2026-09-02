"""Application factory for the isolated FastAPI migration foundation."""

from hashlib import sha256
from time import perf_counter
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.router import router
from app.application import create_application
from app.core.config import Settings, get_settings
from app.core.errors import ApiError, safe_error
from app.core.auth import SupabaseAuthenticator
from app.core.logging import log_event
from app.core.rate_limit import RateLimiter
from app.core.request_id import request_id_from


def create_app(settings: Settings | None = None) -> FastAPI:
    """Construct the local API with safe envelopes, logs, and request context."""

    app = FastAPI(title="Codeology API", version=(settings or get_settings()).version)
    app.state.settings = settings or get_settings()
    app.state.application = create_application()
    app.state.authenticator = SupabaseAuthenticator(app.state.settings) if app.state.settings.adapter == "supabase" else None
    app.state.rate_limiter = RateLimiter(app.state.settings.requests_per_minute)
    app.add_middleware(CORSMiddleware, allow_origins=app.state.settings.origins, allow_credentials=True, allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allow_headers=["authorization", "content-type", "idempotency-key", "x-request-id"])

    @app.middleware("http")
    async def request_context(request: Request, call_next: Any) -> Any:
        request.state.request_id = request_id_from(request.headers.get("x-request-id"))
        length = request.headers.get("content-length")
        if length and (not length.isdigit() or int(length) > 14 * 1024 * 1024):
            return JSONResponse(status_code=413, content=safe_error("file_too_large", "The request exceeds the 14 MB API limit.", request.state.request_id))
        if app.state.settings.adapter == "supabase":
            try:
                authorization = request.headers.get("authorization", "")
                limiter_key = sha256(authorization.encode("utf-8")).hexdigest() if authorization else (request.client.host if request.client else "unknown")
                app.state.rate_limiter.check(limiter_key)
            except ApiError as error:
                return JSONResponse(
                    status_code=error.status_code,
                    content=safe_error(error.code, error.message, request.state.request_id),
                    headers={"x-request-id": request.state.request_id, "retry-after": "60"},
                )
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
