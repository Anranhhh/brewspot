"""
User repository — database access for the profiles and follows tables.
"""

import os
import logging
from server.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


def resolve_avatar_url(avatar_type: str | None, avatar_path: str | None, raw_avatar_url: str | None = None) -> str:
    """Dynamically resolve public Supabase Storage URL from canonical (avatar_type, avatar_path)."""
    supabase_url = os.getenv("SUPABASE_URL", "https://runppvhclespkgdlxyww.supabase.co").rstrip("/")
    if avatar_type == "uploaded" and avatar_path:
        return f"{supabase_url}/storage/v1/object/public/profile-images/{avatar_path}"
    elif avatar_type == "default" and avatar_path:
        return f"{supabase_url}/storage/v1/object/public/profile-defaults/{avatar_path}"
    elif avatar_path and "/" in avatar_path:
        return f"{supabase_url}/storage/v1/object/public/profile-images/{avatar_path}"
    elif avatar_path:
        return f"{supabase_url}/storage/v1/object/public/profile-defaults/{avatar_path}"
    elif raw_avatar_url:
        return raw_avatar_url
    return f"{supabase_url}/storage/v1/object/public/profile-defaults/coffee-beans.png"


def _format_profile(raw: dict) -> dict:
    """Format profile row into standardized user response dictionary."""
    if not raw:
        return {}
    avatar_type = raw.get("avatar_type") or "default"
    avatar_path = raw.get("avatar_path") or "coffee-beans.png"
    resolved_profile = resolve_avatar_url(avatar_type, avatar_path, raw.get("avatar_url"))

    return {
        "id": raw.get("id"),
        "name": raw.get("display_name") or raw.get("username") or "User",
        "display_name": raw.get("display_name") or raw.get("username") or "User",
        "username": raw.get("username"),
        "profile": resolved_profile,
        "avatar_type": avatar_type,
        "avatar_path": avatar_path,
        "bio": raw.get("bio") or "",
        "created_at": raw.get("created_at"),
    }


def get_user_by_id(user_id: str) -> dict | None:
    """
    Fetch a single user profile by UUID.
    @param user_id User UUID
    @returns user dict or None
    """
    client = get_supabase_client()
    try:
        response = client.table("profiles").select("*").eq("id", user_id).execute()
        if response.data:
            return _format_profile(response.data[0])
    except Exception as e:
        logger.warning("Failed to fetch profile for %s: %s", user_id, e)
    return None


def create_user(user_id: str, name: str, profile: str | None = None, username: str | None = None) -> dict:
    """
    Insert or update a profile in public.profiles table.
    @param user_id Pre-generated UUID from auth.users
    @param name Display name
    @param profile Optional avatar URL
    @param username Optional handle
    @returns created/updated user profile dict
    """
    client = get_supabase_client()
    clean_username = username or f"{name.lower().replace(' ', '_')}_{user_id[:4]}"
    
    payload: dict = {
        "id": user_id,
        "username": clean_username,
        "display_name": name,
        "avatar_type": "default",
        "avatar_path": "coffee-beans.png",
        "avatar_url": resolve_avatar_url("default", "coffee-beans.png"),
        "bio": "",
    }
        
    try:
        response = client.table("profiles").upsert(payload).execute()
        created_user = _format_profile(response.data[0])
        return created_user
    except Exception as e:
        logger.error("Failed to upsert profile for user %s: %s", user_id, e)
        return {
            "id": user_id,
            "name": name,
            "display_name": name,
            "username": clean_username,
            "profile": payload["avatar_url"],
            "avatar_type": "default",
            "avatar_path": "coffee-beans.png",
            "bio": "",
        }


def update_user_profile(user_id: str, updates: dict) -> dict:
    """
    Update profile for authenticated user in public.profiles table.
    @param user_id User UUID
    @param updates Dictionary of fields to update
    @returns formatted updated user dict
    """
    client = get_supabase_client()
    payload = {}
    if "display_name" in updates:
        payload["display_name"] = updates["display_name"]
    if "username" in updates and updates["username"]:
        payload["username"] = updates["username"].lower().strip()
    if "bio" in updates:
        payload["bio"] = updates["bio"]
    if "avatar_type" in updates:
        payload["avatar_type"] = updates["avatar_type"]
    if "avatar_path" in updates:
        payload["avatar_path"] = updates["avatar_path"]
        payload["avatar_url"] = resolve_avatar_url(
            updates.get("avatar_type", "default"),
            updates["avatar_path"]
        )

    if not payload:
        existing = get_user_by_id(user_id)
        if existing:
            return existing
        raise ValueError("Profile not found")

    try:
        response = client.table("profiles").update(payload).eq("id", user_id).execute()
        if response.data:
            return _format_profile(response.data[0])
        raise ValueError("Profile not found")
    except Exception as e:
        error_msg = str(e).lower()
        if "23505" in error_msg or "duplicate" in error_msg or "username" in error_msg:
            raise ValueError("That username is already taken.")
        raise ValueError(f"Could not update profile: {e}")


def get_all_users() -> list[dict]:
    """Fetch all profiles."""
    client = get_supabase_client()
    response = client.table("profiles").select("*").execute()
    return [_format_profile(p) for p in response.data]


def find_user(identifier: str) -> dict | None:
    """Find a user profile by UUID, username, or display_name."""
    if not identifier:
        return None
    client = get_supabase_client()
    try:
        res = client.table("profiles").select("*").eq("id", identifier).execute()
        if res.data:
            return _format_profile(res.data[0])
    except Exception:
        pass

    try:
        res = client.table("profiles").select("*").or_(f"username.ilike.{identifier},display_name.ilike.{identifier}").execute()
        if res.data:
            return _format_profile(res.data[0])
    except Exception:
        pass
    return None


def is_user_following(follower_id: str, target_id: str) -> bool:
    """Check if follower_id follows target_id in public.follows table."""
    client = get_supabase_client()
    try:
        res = client.table("follows").select("follower_id").eq("follower_id", follower_id).eq("following_id", target_id).execute()
        return len(res.data) > 0
    except Exception:
        return False


def count_user_followers(target_id: str) -> int:
    """Count followers for target_id from public.follows table."""
    client = get_supabase_client()
    try:
        res = client.table("follows").select("follower_id", count="exact").eq("following_id", target_id).execute()
        return res.count if res.count is not None else len(res.data)
    except Exception:
        return 0


def count_user_following(follower_id: str) -> int:
    """Count following for follower_id from public.follows table."""
    client = get_supabase_client()
    try:
        res = client.table("follows").select("following_id", count="exact").eq("follower_id", follower_id).execute()
        return res.count if res.count is not None else len(res.data)
    except Exception:
        return 0


def follow_user_db(follower_id: str, target_id: str) -> bool:
    """Toggle follow in public.follows table. Returns new is_following state."""
    client = get_supabase_client()
    if follower_id == target_id:
        return False
    currently_following = is_user_following(follower_id, target_id)
    if currently_following:
        client.table("follows").delete().eq("follower_id", follower_id).eq("following_id", target_id).execute()
        return False
    else:
        client.table("follows").insert({"follower_id": follower_id, "following_id": target_id}).execute()
        return True
