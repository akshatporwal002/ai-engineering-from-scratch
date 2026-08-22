"""Validated domain models with no persistence or provider dependencies."""

from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, SecretStr, StringConstraints

BoundedText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100_000)]


class ProviderId(StrEnum):
    GEMINI = "gemini"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


class AnswerState(BaseModel):
    value: int = Field(ge=0, le=20)
    answered_at: datetime | None = None


class LessonProgress(BaseModel):
    lesson_path: str = Field(pattern=r"^(phases|certifications)/[a-z0-9][a-z0-9/-]+$")
    answers: dict[str, AnswerState] = Field(default_factory=dict)
    completed: bool = False
    completion_changed_at: datetime | None = None
    visited_at: datetime | None = None


class ProgressState(BaseModel):
    lessons: list[LessonProgress] = Field(default_factory=list, max_length=600)


class ProviderSelection(BaseModel):
    provider_id: ProviderId
    model_id: str = Field(min_length=1, max_length=80)


class SaveProviderConnection(ProviderSelection):
    credential: SecretStr


class ProviderModelUpdate(BaseModel):
    model_id: str = Field(min_length=1, max_length=80)


class ProviderConnectionView(ProviderSelection):
    id: UUID
    key_hint: str
    created_at: datetime


class CvDocumentCreate(BaseModel):
    filename: str = Field(min_length=1, max_length=180)
    mime_type: str = Field(min_length=1, max_length=100)
    content: bytes | None = Field(default=None, max_length=10 * 1024 * 1024 + 1)
    pasted_text: str | None = Field(default=None, max_length=100_001)
    extracted_text: str | None = Field(default=None, max_length=100_000)
    target_role: str = Field(min_length=1, max_length=120)
    job_description: str = Field(default="", max_length=20_000)
    consent: Literal[True]


class CvDocumentView(BaseModel):
    id: UUID
    filename: str
    mime_type: str
    size_bytes: int
    status: Literal["uploaded", "processing", "complete", "failed"]
    created_at: datetime
    processing_error_code: str | None = None


class ReadinessDimension(BaseModel):
    id: Literal["role-alignment", "evidence", "impact", "skills", "clarity"]
    label: str = Field(min_length=1, max_length=120)
    score: int = Field(ge=0, le=100)
    rationale: str = Field(min_length=1, max_length=500)
    evidence: list[str] = Field(default_factory=list, max_length=12)
    gaps: list[str] = Field(default_factory=list, max_length=12)


class CareerSignal(BaseModel):
    id: Literal["decision-velocity", "authority-gap", "narrative-scarcity", "authority-signal", "seniority-perception", "operational-roi", "governance", "observability", "scalability"]
    label: str = Field(min_length=1, max_length=120)
    score: int = Field(ge=0, le=100)
    finding: str = Field(min_length=1, max_length=500)


class AnalysisResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    readiness_score: int = Field(ge=0, le=100)
    dimensions: list[ReadinessDimension] = Field(min_length=5, max_length=5)
    career_signals: list[CareerSignal] = Field(min_length=9, max_length=9)
    strengths: list[str] = Field(min_length=1, max_length=12)
    gaps: list[str] = Field(min_length=1, max_length=12)
    recommendations: list[str] = Field(min_length=1, max_length=12)
    rewrites: list[str] = Field(default_factory=list, max_length=12)
    lesson_suggestions: list[str] = Field(default_factory=list, max_length=12)


class AnalysisJobView(BaseModel):
    id: UUID
    document_id: UUID
    status: Literal["pending", "complete", "failed"]
    created_at: datetime
    result: AnalysisResult | None = None
    error_code: str | None = None


class CvDocumentDetail(BaseModel):
    document: CvDocumentView
    analyses: list[AnalysisJobView]


class Page(BaseModel):
    items: list[CvDocumentView]
    offset: int = Field(ge=0)
    limit: int = Field(ge=1, le=100)
    total: int = Field(ge=0)


class AnalysisInput(BaseModel):
    cv_text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=120, max_length=100_000)]
    target_role: str = Field(min_length=1, max_length=120)
    job_description: str = Field(default="", max_length=20_000)


class AnalysisCreate(AnalysisInput):
    connection_id: UUID
