"""
Pydantic models mirroring the Supabase DB schema.
These represent the domain entities used across the application.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class User(BaseModel):
    id: str
    name: str
    avatar: Optional[str] = None
    created_at: Optional[datetime] = None


class Cafe(BaseModel):
    id: str
    name: str
    rating: float = 0
    reviews: int = 0
    price_level: Optional[str] = None
    type: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    hero_image: Optional[str] = None
    inspiration_images: list[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None


class Post(BaseModel):
    id: str
    user_id: str
    image_url: str
    location: Optional[str] = None
    rating: Optional[float] = None
    caption: Optional[str] = None
    created_at: Optional[datetime] = None


class Comment(BaseModel):
    id: str
    post_id: str
    user_id: str
    text: str
    created_at: Optional[datetime] = None
