"""
Pydantic request/response schemas for API validation.
Separates API contract from internal domain models.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional


# --- Auth ---

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=100)


# --- Posts ---

class CreatePostRequest(BaseModel):
    image_url: str
    location: Optional[str] = None
    rating: Optional[float] = Field(default=None, ge=0, le=5)
    caption: Optional[str] = None


# --- Comments ---

class CreateCommentRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
