"""Supabase JWT verification and request-scoped authenticated principals."""

from dataclasses import dataclass
from time import monotonic
from uuid import UUID

import httpx
import jwt
from fastapi import Request

from app.core.config import Settings
from app.core.errors import ApiError


@dataclass(frozen=True, slots=True)
class Principal:
    user_id: UUID
    access_token: str


class SupabaseAuthenticator:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._jwks: dict[str, object] | None = None
        self._jwks_at = 0.0

    async def _keys(self, *, force: bool = False) -> dict[str, object]:
        if not force and self._jwks is not None and monotonic() - self._jwks_at < 3600:
            return self._jwks
        endpoint = f"{self.settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(endpoint, headers={"apikey": self.settings.supabase_publishable_key.get_secret_value()})
                response.raise_for_status()
                body = response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise ApiError("authentication_unavailable", "Account verification is temporarily unavailable.", 503) from error
        if not isinstance(body, dict) or not isinstance(body.get("keys"), list):
            raise ApiError("authentication_unavailable", "Account verification is temporarily unavailable.", 503)
        self._jwks, self._jwks_at = body, monotonic()
        return body

    async def verify(self, token: str) -> Principal:
        try:
            header = jwt.get_unverified_header(token)
            kid = header.get("kid")
            keys = (await self._keys())["keys"]  # type: ignore[index]
            key_data = next((item for item in keys if isinstance(item, dict) and item.get("kid") == kid), None)
            if key_data is None:
                keys = (await self._keys(force=True))["keys"]  # type: ignore[index]
                key_data = next(item for item in keys if isinstance(item, dict) and item.get("kid") == kid)
            key = jwt.PyJWK.from_dict(key_data).key
            claims = jwt.decode(token, key, algorithms=["RS256", "ES256"], audience=self.settings.jwt_audience, issuer=f"{self.settings.supabase_url.rstrip('/')}/auth/v1", options={"require": ["exp", "iat", "sub", "iss", "aud"]})
            return Principal(UUID(str(claims["sub"])), token)
        except ApiError:
            raise
        except (jwt.PyJWTError, StopIteration, KeyError, TypeError, ValueError) as error:
            raise ApiError("authentication_required", "Sign in again to continue.", 401) from error


def bearer_token(request: Request) -> str:
    value = request.headers.get("authorization", "")
    scheme, _, token = value.partition(" ")
    if scheme.lower() != "bearer" or not token or len(token) > 8192:
        raise ApiError("authentication_required", "Sign in to continue.", 401)
    return token
