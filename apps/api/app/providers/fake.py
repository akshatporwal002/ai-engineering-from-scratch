"""Compiled fake provider registry; no adapter can perform network I/O."""

from enum import StrEnum
from typing import Protocol

from pydantic import SecretStr

from app.core.errors import ApiError
from app.domain.models import AnalysisInput, AnalysisResult, CareerSignal, ProviderId, ReadinessDimension


class AnalysisProvider(Protocol):
    async def verify_key(self, secret: SecretStr, model: str) -> None: ...
    async def analyze_cv(self, secret: SecretStr, model: str, request: AnalysisInput) -> AnalysisResult: ...


class FakeOutcome(StrEnum):
    SUCCESS = "success"
    INVALID_KEY = "invalid_key"
    QUOTA = "quota"
    RATE_LIMIT = "rate_limit"
    UNAVAILABLE = "unavailable"
    TIMEOUT = "timeout"
    MALFORMED = "malformed"
    SAFETY = "safety"


ERRORS = {
    FakeOutcome.INVALID_KEY: ("provider_request_invalid", "The provider rejected this credential.", 400),
    FakeOutcome.QUOTA: ("provider_service_error", "The provider quota is exhausted.", 503),
    FakeOutcome.RATE_LIMIT: ("analysis_rate_limited", "Try the analysis again later.", 429),
    FakeOutcome.UNAVAILABLE: ("provider_unavailable", "The provider is temporarily unavailable.", 503),
    FakeOutcome.TIMEOUT: ("provider_timeout", "The provider did not respond in time.", 504),
    FakeOutcome.MALFORMED: ("provider_schema_invalid", "The provider returned an invalid response.", 502),
    FakeOutcome.SAFETY: ("provider_rejected", "The provider could not process this request safely.", 422),
}


class FakeProvider:
    def __init__(self, outcome: FakeOutcome = FakeOutcome.SUCCESS) -> None:
        self.outcome = outcome

    async def verify_key(self, secret: SecretStr, model: str) -> None:
        if not secret.get_secret_value().startswith("fake-") or self.outcome == FakeOutcome.INVALID_KEY:
            raise ApiError(*ERRORS[FakeOutcome.INVALID_KEY])
        if not model:
            raise ApiError("provider_model_unavailable", "Select a supported provider model.", 422)

    async def analyze_cv(self, secret: SecretStr, model: str, request: AnalysisInput) -> AnalysisResult:
        await self.verify_key(secret, model)
        if self.outcome != FakeOutcome.SUCCESS:
            raise ApiError(*ERRORS[self.outcome])
        dimension_ids = ["role-alignment", "evidence", "impact", "skills", "clarity"]
        signal_ids = ["decision-velocity", "authority-gap", "narrative-scarcity", "authority-signal", "seniority-perception", "operational-roi", "governance", "observability", "scalability"]
        return AnalysisResult(
            readiness_score=72,
            dimensions=[ReadinessDimension(id=value, label=value.replace("-", " ").title(), score=68 + index, rationale=f"Deterministic {value} fixture.", evidence=["Synthetic fixture evidence"], gaps=[]) for index, value in enumerate(dimension_ids)],
            career_signals=[CareerSignal(id=value, label=value.replace("-", " ").title(), score=60 + index, finding="Deterministic fixture finding.") for index, value in enumerate(signal_ids)],
            strengths=["Clear technical foundation"], gaps=["Add quantified outcomes"], recommendations=["Connect one project to measurable impact"],
            rewrites=["Built an evaluated system with measurable reliability."], lesson_suggestions=["phases/16-evaluation-and-benchmarking"],
        )


MODELS = {ProviderId.GEMINI: {"gemini-2.5-flash"}, ProviderId.OPENAI: {"gpt-5-mini"}, ProviderId.ANTHROPIC: {"claude-sonnet-4-5"}}


def validate_model(provider_id: ProviderId, model_id: str) -> str:
    if model_id not in MODELS[provider_id]:
        raise ApiError("provider_model_unavailable", "Select a supported provider model.", 422)
    return model_id


def provider_for(provider_id: ProviderId, outcome: FakeOutcome = FakeOutcome.SUCCESS) -> AnalysisProvider:
    if provider_id not in MODELS:
        raise ApiError("provider_unavailable", "The provider is unavailable.", 503)
    return FakeProvider(outcome)
