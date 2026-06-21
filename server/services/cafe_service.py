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


import uuid

def _resolve_uuid(id_str: str) -> str:
    """
    Resolve a string to a valid UUID. If it's not a standard UUID,
    generates a deterministic UUID v5 from it.
    """
    try:
        return str(uuid.UUID(id_str))
    except ValueError:
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, id_str))


def get_cafe_detail(cafe_id: str, user_id: str | None = None) -> dict | None:
    """
    Get a single cafe with save-state annotation.
    @param cafe_id Cafe UUID or Place ID
    @param user_id Optional user UUID
    @returns formatted cafe dict or None
    """
    resolved_id = _resolve_uuid(cafe_id)
    cafe = cafe_repository.get_cafe_by_id(resolved_id)
    if not cafe:
        return None

    is_saved = False
    if user_id:
        is_saved = cafe_repository.is_cafe_saved(user_id, resolved_id)

    return _format_cafe(cafe, is_saved)


def toggle_save(user_id: str, cafe_id: str, cafe_data: dict | None = None) -> dict:
    """
    Toggle save state for a cafe. If it does not exist, creates it using cafe_data.
    @param user_id User UUID
    @param cafe_id Cafe UUID or Place ID
    @param cafe_data Optional cafe details for auto-creation
    @returns dict with isSaved state
    """
    resolved_id = _resolve_uuid(cafe_id)

    # If the cafe is not in our database, insert it first
    if not cafe_repository.get_cafe_by_id(resolved_id):
        if not cafe_data:
            raise ValueError("Cafe metadata details (cafe_data) must be provided to save a new cafe.")
        
        cafe_repository.create_cafe(
            id=resolved_id,
            name=cafe_data.get("name", "Unknown Cafe"),
            rating=float(cafe_data.get("rating") or 0.0),
            reviews=int(cafe_data.get("reviews") or 0),
            price_level=cafe_data.get("priceLevel", ""),
            cafe_type=cafe_data.get("type", "Cafe"),
            address=cafe_data.get("address", ""),
            status=cafe_data.get("status", ""),
            tags=cafe_data.get("tags") or [],
            hero_image=cafe_data.get("heroImage", ""),
            inspiration_images=cafe_data.get("inspirationImages") or [],
            latitude=float(cafe_data["latitude"]) if cafe_data.get("latitude") is not None else None,
            longitude=float(cafe_data["longitude"]) if cafe_data.get("longitude") is not None else None
        )

    is_saved = cafe_repository.toggle_cafe_save(user_id, resolved_id)
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
        "latitude": float(cafe["latitude"]) if cafe.get("latitude") is not None else None,
        "longitude": float(cafe["longitude"]) if cafe.get("longitude") is not None else None,
    }
