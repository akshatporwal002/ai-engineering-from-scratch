"""Stable public error responses with request correlation only."""

from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    code: str
    message: str
    request_id: str
    details: dict[str, Any] | None = None


@dataclass(slots=True)
class ApiError(Exception):
    code: str
    message: str
    status_code: int
    details: dict[str, Any] | None = None


def safe_error(code: str, message: str, request_id: str, *, details: dict[str, Any] | None = None) -> dict[str, Any]:
    """Create the sole API error envelope used by handlers."""

    return ErrorResponse(code=code, message=message, request_id=request_id, details=details).model_dump(exclude_none=True)
