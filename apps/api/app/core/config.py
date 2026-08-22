"""Configuration intentionally reads environment variables only, never .env files."""

from functools import lru_cache

from pydantic import BaseModel, Field


class Settings(BaseModel):
    """Immutable, secret-free configuration for the local experiment."""

    environment: str = Field(default="development", min_length=1)
    version: str = Field(default="0.1.0-experiment", min_length=1)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached defaults without loading a dotenv file or logging values."""

    return Settings()
