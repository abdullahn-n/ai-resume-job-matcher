from datetime import datetime

from pydantic import BaseModel, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Analysis ──────────────────────────────────────────────────────────────────

class AnalysisCreateResponse(BaseModel):
    id: str
    status: str


class AnalysisResponse(BaseModel):
    id: str
    status: str
    job_description: str
    match_score: float | None = None
    matched_skills: list[str] | None = None
    missing_skills: list[str] | None = None
    suggestions: list[str] | None = None
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None


class AnalysisListItem(BaseModel):
    id: str
    status: str
    match_score: float | None = None
    job_description_preview: str
    created_at: datetime


# ── AI Result (internal, used to validate Ollama response) ────────────────────

class AIAnalysisResult(BaseModel):
    match_score: float
    matched_skills: list[str]
    missing_skills: list[str]
    suggestions: list[str]
