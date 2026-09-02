"""Validated runtime configuration; secrets are never logged or serialized."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="CODEOLOGY_API_", extra="ignore")

    environment: Literal["development", "test", "preview", "production"] = "development"
    version: str = Field(default="0.2.0", min_length=1)
    adapter: Literal["memory", "supabase"] = "memory"
    allowed_origins: str = "http://127.0.0.1:3000,http://localhost:3000"
    supabase_url: str = ""
    supabase_publishable_key: SecretStr = SecretStr("")
    supabase_service_role_key: SecretStr = SecretStr("")
    jwt_audience: str = "authenticated"
    provider_timeout_seconds: float = Field(default=45.0, ge=2, le=120)
    requests_per_minute: int = Field(default=60, ge=5, le=600)

    @property
    def origins(self) -> list[str]:
        return [value.strip().rstrip("/") for value in self.allowed_origins.split(",") if value.strip()]

    @model_validator(mode="after")
    def production_must_fail_closed(self) -> "Settings":
        if self.environment in {"preview", "production"}:
            if self.adapter != "supabase":
                raise ValueError("preview and production require CODEOLOGY_API_ADAPTER=supabase")
            required = {
                "CODEOLOGY_API_SUPABASE_URL": self.supabase_url,
                "CODEOLOGY_API_SUPABASE_PUBLISHABLE_KEY": self.supabase_publishable_key.get_secret_value(),
                "CODEOLOGY_API_SUPABASE_SERVICE_ROLE_KEY": self.supabase_service_role_key.get_secret_value(),
            }
            missing = [name for name, value in required.items() if not value]
            if missing:
                raise ValueError(f"missing production configuration: {', '.join(missing)}")
            if not self.supabase_url.startswith("https://"):
                raise ValueError("preview and production require an HTTPS Supabase URL")
            if not self.origins or "*" in self.origins or any(not origin.startswith("https://") for origin in self.origins):
                raise ValueError("preview and production require explicit HTTPS allowed origins")
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
