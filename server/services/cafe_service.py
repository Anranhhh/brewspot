"""
Cafe service — business logic for cafe listing, details, and saving.
"""

import logging
from server.repositories import cafe_repository

logger = logging.getLogger(__name__)


def get_cafes(user_id: str | None = None) -> list[dict]:
    """
    Get all cafes, annotated with isSaved state for the given user.
    @param user_id Optional user UUID for save-state annotation
    @returns list of cafe dicts with camelCase keys
    """
    cafes = cafe_repository.get_all_cafes()
    saved_ids: set[str] = set()
    if user_id:
        saved_ids = set(cafe_repository.get_saved_cafe_ids(user_id))

    return [_format_cafe(cafe, cafe["id"] in saved_ids) for cafe in cafes]


def get_cafe_detail(cafe_id: str, user_id: str | None = None) -> dict | None:
    """
    Get a single cafe with save-state annotation.
    @param cafe_id Cafe UUID
    @param user_id Optional user UUID
    @returns formatted cafe dict or None
    """
    cafe = cafe_repository.get_cafe_by_id(cafe_id)
    if not cafe:
        return None

    is_saved = False
    if user_id:
        is_saved = cafe_repository.is_cafe_saved(user_id, cafe_id)

    return _format_cafe(cafe, is_saved)


def toggle_save(user_id: str, cafe_id: str) -> dict:
    """
    Toggle save state for a cafe.
    @param user_id User UUID
    @param cafe_id Cafe UUID
    @returns dict with isSaved state
    """
    is_saved = cafe_repository.toggle_cafe_save(user_id, cafe_id)
    return {"isSaved": is_saved}


def _format_cafe(cafe: dict, is_saved: bool = False) -> dict:
    """
    Transform DB snake_case cafe to frontend camelCase format.
    """
    return {
        "id": cafe["id"],
        "name": cafe["name"],
        "rating": float(cafe.get("rating") or 0),
        "reviews": cafe.get("reviews", 0),
        "priceLevel": cafe.get("price_level", ""),
        "type": cafe.get("type", ""),
        "address": cafe.get("address", ""),
        "status": cafe.get("status", ""),
        "tags": cafe.get("tags") or [],
        "heroImage": cafe.get("hero_image", ""),
        "inspirationImages": cafe.get("inspiration_images") or [],
        "isSaved": is_saved,
    }
