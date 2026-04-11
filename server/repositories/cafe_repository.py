"""
Cafe repository — database access for cafes and cafe_saves tables.
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
    Fetch a single cafe by UUID.
    @param cafe_id Cafe UUID
    @returns cafe dict or None
    """
    client = get_supabase_client()
    response = client.table("cafes").select("*").eq("id", cafe_id).execute()
    if response.data:
        return response.data[0]
    return None


def is_cafe_saved(user_id: str, cafe_id: str) -> bool:
    """
    Check if a user has saved a specific cafe.
    @param user_id User UUID
    @param cafe_id Cafe UUID
    @returns True if saved
    """
    client = get_supabase_client()
    response = (
        client.table("cafe_saves")
        .select("user_id")
        .eq("user_id", user_id)
        .eq("cafe_id", cafe_id)
        .execute()
    )
    return len(response.data) > 0


def toggle_cafe_save(user_id: str, cafe_id: str) -> bool:
    """
    Toggle save state for a cafe. Returns new saved state.
    @param user_id User UUID
    @param cafe_id Cafe UUID
    @returns True if now saved, False if unsaved
    """
    client = get_supabase_client()
    if is_cafe_saved(user_id, cafe_id):
        client.table("cafe_saves").delete().eq(
            "user_id", user_id
        ).eq("cafe_id", cafe_id).execute()
        return False
    else:
        client.table("cafe_saves").insert(
            {"user_id": user_id, "cafe_id": cafe_id}
        ).execute()
        return True


def get_saved_cafe_ids(user_id: str) -> list[str]:
    """
    Get all cafe IDs saved by a user.
    @param user_id User UUID
    @returns list of cafe ID strings
    """
    client = get_supabase_client()
    response = (
        client.table("cafe_saves")
        .select("cafe_id")
        .eq("user_id", user_id)
        .execute()
    )
    return [row["cafe_id"] for row in response.data]
