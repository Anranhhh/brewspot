"""
User repository — database access for the users table.
"""

import logging
from server.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


def get_user_by_id(user_id: str) -> dict | None:
    """
    Fetch a single user by their UUID.
    @param user_id User UUID
    @returns user dict or None
    """
    client = get_supabase_client()
    response = client.table("users").select("*").eq("id", user_id).execute()
    if response.data:
        return response.data[0]
    return None


def create_user(user_id: str, name: str, profile: str | None = None) -> dict:
    """
    Insert a new user into the users table.
    Uses a pre-generated ID (usually from Supabase Auth).
    @param user_id Pre-generated UUID from auth
    @param name Display name
    @param avatar Optional avatar URL
    @returns created user dict
    """
    client = get_supabase_client()
    payload: dict = {"id": user_id, "name": name}
    if profile:
        payload["profile"] = profile
        
    try:
        response = client.table("users").insert(payload).execute()
        created_user = response.data[0]
        
        # Inject system welcome notification
        from server.repositories.message_repository import create_notification
        create_notification(
            user_id=user_id,
            action="Welcome to BrewSpot! Start exploring aesthetic corners.",
            system=True
        )
        return created_user
    except Exception as e:
        logger.warning(f"Failed to create user with profile, trying without: {e}")
        if profile and "profile" in str(e):
            del payload["profile"]
            response = client.table("users").insert(payload).execute()
            created_user = response.data[0]
            
            # Inject system welcome notification
            from server.repositories.message_repository import create_notification
            create_notification(
                user_id=user_id,
                action="Welcome to BrewSpot! Start exploring aesthetic corners.",
                system=True
            )
            return created_user
        raise


def get_all_users() -> list[dict]:
    """
    Fetch all users. Used for admin / seed verification.
    @returns list of user dicts
    """
    client = get_supabase_client()
    response = client.table("users").select("*").execute()
    return response.data
