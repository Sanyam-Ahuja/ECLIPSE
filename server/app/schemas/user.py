"""Pydantic schemas for User endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

# ── Request Schemas ─────────────────────────────────────────────

class UserRegister(BaseModel):
    email: str = Field(..., min_length=3, max_length=255, examples=["student@university.edu"])
    name: str = Field(..., min_length=1, max_length=255, examples=["Samito"])
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(default="customer", pattern="^(customer|contributor|both)$")


class UserLogin(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    """Exchange Google OAuth code for our JWT."""
    google_token: str


# ── Response Schemas ────────────────────────────────────────────

class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    role: str
    credit_balance: float
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
