"""
Cafe service — business logic for cafe listing, details, and saving.
"""

import uuid
import logging
from server.repositories import cafe_repository

logger = logging.getLogger(__name__)


def _resolve_uuid(id_str: str) -> str:
    """
    Resolve a string to a valid UUID. If it's not a standard UUID,
    generates a deterministic UUID v5 from it.
    """
    try:
        return str(uuid.UUID(id_str))
    except ValueError:
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, id_str))


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

    def _is_saved(c: dict) -> bool:
        cid = c["id"]
        return cid in saved_ids or _resolve_uuid(cid) in saved_ids

    return [_format_cafe(cafe, _is_saved(cafe)) for cafe in cafes]


def get_saved_cafes(user_id: str) -> list[dict]:
    """
    Get all cafes saved by a user from saved_cafes and cafes tables.
    """
    db_saved = cafe_repository.get_saved_cafes_full(user_id)
    saved_ids = set(cafe_repository.get_saved_cafe_ids(user_id))
    all_cafes = cafe_repository.get_all_cafes()

    from_cafes_tbl = [
        _format_cafe(c, True) for c in all_cafes
        if c["id"] in saved_ids or _resolve_uuid(c["id"]) in saved_ids
    ]

    # Deduplicate by ID
    merged_map = {}
    for c in from_cafes_tbl:
        merged_map[c["id"]] = c
    for c in db_saved:
        if c["id"] not in merged_map:
            merged_map[c["id"]] = c

    return list(merged_map.values())


def get_cafe_detail(cafe_id: str, user_id: str | None = None) -> dict | None:
    """
    Get a single cafe with save-state annotation.
    """
    resolved_id = _resolve_uuid(cafe_id)
    cafe = cafe_repository.get_cafe_by_id(cafe_id) or cafe_repository.get_cafe_by_id(resolved_id)
    if not cafe:
        return None

    is_saved = False
    if user_id:
        is_saved = cafe_repository.is_cafe_saved(user_id, cafe_id) or cafe_repository.is_cafe_saved(user_id, resolved_id)

    return _format_cafe(cafe, is_saved)


def toggle_save(user_id: str, cafe_id: str, cafe_data: dict | None = None) -> dict:
    """
    Toggle save state for a cafe.
    """
    resolved_id = _resolve_uuid(cafe_id)
    c_name = (cafe_data.get("name") if cafe_data else None) or "Café"
    c_addr = (cafe_data.get("address") if cafe_data else None) or ""
    c_hero = (cafe_data.get("heroImage") if cafe_data else None) or ""
    c_rating = float(cafe_data.get("rating") if cafe_data and cafe_data.get("rating") is not None else 0.0)

    # If the cafe is not in cafes table, insert it
    if not cafe_repository.get_cafe_by_id(cafe_id) and not cafe_repository.get_cafe_by_id(resolved_id):
        if cafe_data:
            try:
                cafe_repository.create_cafe(
                    id=resolved_id,
                    name=c_name,
                    rating=c_rating,
                    reviews=int(cafe_data.get("reviews") or 0),
                    price_level=cafe_data.get("priceLevel", "$$"),
                    cafe_type=cafe_data.get("type", "Specialty Coffee"),
                    address=c_addr,
                    status=cafe_data.get("status", "Open"),
                    tags=cafe_data.get("tags") or [],
                    hero_image=c_hero,
                    inspiration_images=cafe_data.get("inspirationImages") or [],
                    latitude=float(cafe_data["latitude"]) if cafe_data.get("latitude") is not None else None,
                    longitude=float(cafe_data["longitude"]) if cafe_data.get("longitude") is not None else None
                )
            except Exception as e:
                logger.warning(f"Could not auto-create cafe row: {e}")

    is_saved = cafe_repository.toggle_cafe_save(user_id, cafe_id, c_name, c_addr, c_hero, c_rating)
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
