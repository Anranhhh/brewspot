"""
Cafe repository — database access for cafes, saved_cafes, and cafe_saves tables.
"""

import logging
from server.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


def get_all_cafes() -> list[dict]:
    """
    Fetch all cafes ordered by rating descending.
    @returns list of cafe dicts
    """
    client = get_supabase_client()
    response = (
        client.table("cafes")
        .select("*")
        .order("rating", desc=True)
        .execute()
    )
    return response.data


def get_cafe_by_id(cafe_id: str) -> dict | None:
    """
    Fetch a single cafe by UUID or google_place_id.
    """
    client = get_supabase_client()
    try:
        response = client.table("cafes").select("*").eq("id", cafe_id).execute()
        if response.data:
            return response.data[0]
    except Exception:
        pass

    try:
        response = client.table("cafes").select("*").eq("google_place_id", cafe_id).execute()
        if response.data:
            return response.data[0]
    except Exception:
        pass

    return None


def get_cafes_by_ids(cafe_ids: list[str]) -> list[dict]:
    """
    Fetch cafes by ID list.
    """
    if not cafe_ids:
        return []
    client = get_supabase_client()
    response = (
        client.table("cafes")
        .select("*")
        .in_("id", cafe_ids)
        .order("rating", desc=True)
        .execute()
    )
    return response.data


def is_cafe_saved(user_id: str, cafe_id: str) -> bool:
    """
    Check if a user has saved a specific cafe in saved_cafes or cafe_saves.
    """
    client = get_supabase_client()
    try:
        res = client.table("saved_cafes").select("user_id").eq("user_id", user_id).eq("google_place_id", cafe_id).execute()
        if len(res.data) > 0:
            return True
    except Exception:
        pass

    try:
        res = client.table("cafe_saves").select("user_id").eq("user_id", user_id).eq("cafe_id", cafe_id).execute()
        return len(res.data) > 0
    except Exception:
        return False


def toggle_cafe_save(user_id: str, cafe_id: str, cafe_name: str = "", cafe_address: str = "", hero_image: str = "", rating: float = 0.0) -> bool:
    """
    Toggle save state for a cafe across saved_cafes and cafe_saves tables.
    """
    client = get_supabase_client()
    if is_cafe_saved(user_id, cafe_id):
        try:
            client.table("saved_cafes").delete().eq("user_id", user_id).eq("google_place_id", cafe_id).execute()
        except Exception:
            pass
        try:
            client.table("cafe_saves").delete().eq("user_id", user_id).eq("cafe_id", cafe_id).execute()
        except Exception:
            pass
        return False
    else:
        try:
            client.table("saved_cafes").insert({
                "user_id": user_id,
                "google_place_id": cafe_id,
                "cafe_name": cafe_name or "Café",
                "cafe_address": cafe_address,
                "hero_image": hero_image,
                "rating": rating
            }).execute()
        except Exception:
            try:
                client.table("cafe_saves").insert({"user_id": user_id, "cafe_id": cafe_id}).execute()
            except Exception:
                pass
        return True


def get_saved_cafe_ids(user_id: str) -> list[str]:
    """
    Get all cafe IDs / google_place_ids saved by a user.
    """
    client = get_supabase_client()
    saved_ids = []
    try:
        res1 = client.table("saved_cafes").select("google_place_id").eq("user_id", user_id).execute()
        saved_ids.extend([row["google_place_id"] for row in res1.data])
    except Exception:
        pass

    try:
        res2 = client.table("cafe_saves").select("cafe_id").eq("user_id", user_id).execute()
        saved_ids.extend([row["cafe_id"] for row in res2.data])
    except Exception:
        pass

    return list(set(saved_ids))


def get_saved_cafes_full(user_id: str) -> list[dict]:
    """
    Fetch formatted saved cafe objects from saved_cafes.
    """
    client = get_supabase_client()
    try:
        res = client.table("saved_cafes").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        if res.data:
            return [
                {
                    "id": r.get("google_place_id"),
                    "name": r.get("cafe_name"),
                    "address": r.get("cafe_address", ""),
                    "heroImage": r.get("hero_image", ""),
                    "rating": float(r.get("rating") or 0),
                    "reviews": 0,
                    "priceLevel": "$$",
                    "type": "Specialty Coffee",
                    "status": "Open",
                    "tags": ["Saved"],
                    "inspirationImages": [],
                    "isSaved": True
                }
                for r in res.data
            ]
    except Exception:
        pass
    return []


def create_cafe(
    id: str,
    name: str,
    rating: float = 0.0,
    reviews: int = 0,
    price_level: str = "",
    cafe_type: str = "Cafe",
    address: str = "",
    status: str = "",
    tags: list[str] = [],
    hero_image: str = "",
    inspiration_images: list[str] = [],
    latitude: float | None = None,
    longitude: float | None = None
) -> dict:
    """
    Insert a new cafe into the cafes table.
    """
    client = get_supabase_client()
    payload = {
        "id": id,
        "name": name,
        "rating": rating,
        "reviews": reviews,
        "price_level": price_level,
        "type": cafe_type,
        "address": address,
        "status": status,
        "tags": tags,
        "hero_image": hero_image,
        "inspiration_images": inspiration_images,
    }
    try:
        response = client.table("cafes").insert(payload).execute()
        return response.data[0] if response.data else payload
    except Exception as e:
        logger.warning(f"Error creating cafe {id}: {e}")
        minimal_payload = {"id": id, "name": name, "rating": rating, "address": address}
        try:
            response = client.table("cafes").insert(minimal_payload).execute()
            return response.data[0] if response.data else minimal_payload
        except Exception as inner_e:
            logger.error(f"Failed minimal cafe insert for {id}: {inner_e}")
            return payload
