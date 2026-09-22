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
    cafe_id: str = Field(min_length=1)
    media_urls: list[str] = Field(default_factory=list, max_length=10)
    title: Optional[str] = Field(default=None, max_length=120)
    location: Optional[str] = None
    rating: Optional[float] = Field(default=None, ge=0, le=5)
    caption: Optional[str] = None


class CreateCafeRequest(BaseModel):
    google_place_id: str = Field(min_length=1, max_length=255)
    name: str = Field(min_length=1, max_length=255)
    address: str = Field(default="", max_length=500)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_rating: Optional[float] = Field(default=None, ge=0, le=5)
    google_rating_count: Optional[int] = Field(default=None, ge=0)
    price_level: Optional[str] = ""
    cafe_type: Optional[str] = "Cafe"


# --- Comments ---

class CreateCommentRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    parent_id: str | None = None
