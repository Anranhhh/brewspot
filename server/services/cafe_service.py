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

    formatted = []
    for cafe in cafes:
        item = {**cafe, **cafe_repository.get_cafe_stats(cafe["id"])}
        item = _format_cafe(item, _is_saved(cafe))
        formatted.append(item)
    return formatted


def get_saved_cafes(user_id: str) -> list[dict]:
    """
    Get all cafes saved by a user from saved_cafes and cafes tables.
    """
    db_saved = cafe_repository.get_saved_cafes_full(user_id)
    saved_ids = set(cafe_repository.get_saved_cafe_ids(user_id))
    all_cafes = cafe_repository.get_all_cafes()

    from_cafes_tbl = [
        _format_cafe({**c, **cafe_repository.get_cafe_stats(c["id"])}, True) for c in all_cafes
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


def get_trending_cafes(user_id: str | None = None) -> list[dict]:
    saved_ids = set(cafe_repository.get_saved_cafe_ids(user_id)) if user_id else set()
    cafes = cafe_repository.get_trending_cafes(saved_ids=saved_ids)
    return [_format_cafe(cafe, bool(cafe.get("is_saved"))) for cafe in cafes]


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

    return _format_cafe({**cafe, **cafe_repository.get_cafe_stats(cafe["id"])}, is_saved)


def search_cafes(query: str, user_id: str | None = None) -> list[dict]:
    saved_ids = set(cafe_repository.get_saved_cafe_ids(user_id)) if user_id else set()
    return [_format_cafe({**c, **cafe_repository.get_cafe_stats(c["id"])}, c["id"] in saved_ids) for c in cafe_repository.search_cafes(query)]


def create_google_cafe(user_id: str, data: dict) -> dict:
    existing = cafe_repository.get_cafe_by_google_place_id(data["google_place_id"])
    if existing:
        return _format_cafe(existing, False)
    payload = {
        "name": data["name"], "address": data.get("address", ""),
        "google_place_id": data["google_place_id"], "created_by": user_id,
        "source": "google_places", "google_rating": data.get("google_rating"),
        "google_rating_count": data.get("google_rating_count"),
        "price_level": data.get("price_level") or "", "type": data.get("cafe_type") or "Cafe",
        "latitude": data.get("latitude"), "longitude": data.get("longitude"),
    }
    try:
        return _format_cafe(cafe_repository.insert_google_cafe(payload), False)
    except Exception:
        existing = cafe_repository.get_cafe_by_google_place_id(data["google_place_id"])
        if existing:
            return _format_cafe(existing, False)
        raise


def toggle_save(user_id: str, cafe_id: str, cafe_data: dict | None = None, desired_saved: bool | None = None) -> dict:
    """
    Toggle save state for a cafe.
    """
    resolved_id = _resolve_uuid(cafe_id)
    c_name = (cafe_data.get("name") if cafe_data else None) or "Café"
    c_addr = (cafe_data.get("address") if cafe_data else None) or ""
    c_hero = (cafe_data.get("heroImage") if cafe_data else None) or ""
    c_rating = float(cafe_data.get("rating") if cafe_data and cafe_data.get("rating") is not None else 0.0)

    # Resolve Google Place IDs to the BrewSpot internal cafe UUID before
    # writing cafe_saves.cafe_id.
    cafe_record = cafe_repository.get_cafe_by_id(cafe_id) or cafe_repository.get_cafe_by_id(resolved_id)
    if not cafe_record:
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
                cafe_record = cafe_repository.get_cafe_by_id(resolved_id)
            except Exception as e:
                logger.warning(f"Could not auto-create cafe row: {e}")

    canonical_cafe_id = (cafe_record or {}).get("id") or cafe_id
    is_saved = (
        cafe_repository.set_cafe_save(user_id, canonical_cafe_id, desired_saved, c_name, c_addr, c_hero, c_rating)
        if desired_saved is not None
        else cafe_repository.toggle_cafe_save(user_id, canonical_cafe_id, c_name, c_addr, c_hero, c_rating)
    )
    return {"isSaved": is_saved, "cafeId": canonical_cafe_id}


def _format_cafe(cafe: dict, is_saved: bool = False) -> dict:
    """
    Transform DB snake_case cafe to frontend camelCase format.
    """
    return {
        "id": cafe["id"],
        "name": cafe["name"],
        "rating": float(cafe.get("community_rating") or 0),
        "reviews": int(cafe.get("rating_count") or 0),
        "communityRating": float(cafe.get("community_rating") or 0),
        "communityRatingCount": int(cafe.get("rating_count") or 0),
        "googleRating": float(cafe.get("google_rating") or cafe.get("rating") or 0),
        "googleRatingCount": int(cafe.get("google_rating_count") or cafe.get("reviews") or 0),
        "googlePlaceId": cafe.get("google_place_id"),
        "source": cafe.get("source", "legacy"),
        "postCount": int(cafe.get("post_count") or 0),
        "priceLevel": cafe.get("price_level", ""),
        "type": cafe.get("type", ""),
        "address": cafe.get("address", ""),
        "status": cafe.get("status", ""),
        "tags": cafe.get("tags") or [],
        "heroImage": cafe.get("cover_image_url") or cafe.get("hero_image", ""),
        "inspirationImages": cafe.get("inspiration_images") or [],
        "isSaved": is_saved,
        "latitude": float(cafe["latitude"]) if cafe.get("latitude") is not None else None,
        "longitude": float(cafe["longitude"]) if cafe.get("longitude") is not None else None,
    }
