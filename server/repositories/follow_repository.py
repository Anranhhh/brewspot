"""
Follow Repository — dedicated repository for user follow relationships.
Records each follow action with follower_id, following_id, id, and created_at.
Persists to Supabase `follows` table if created, or local persistent store.
"""

import json
import os
import uuid
import logging
from datetime import datetime, timezone
from server.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
FOLLOWS_FILE = os.path.join(DATA_DIR, "follows.json")


def _ensure_data_dir():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(FOLLOWS_FILE):
        with open(FOLLOWS_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)


def _load_local_follows() -> list[dict]:
    _ensure_data_dir()
    try:
        with open(FOLLOWS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading local follows: {e}")
        return []


def _save_local_follows(follows: list[dict]):
    _ensure_data_dir()
    try:
        with open(FOLLOWS_FILE, "w", encoding="utf-8") as f:
            json.dump(follows, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving local follows: {e}")


def is_following(follower_id: str, following_id: str) -> bool:
    """
    Check if follower_id is currently following following_id.
    """
    client = get_supabase_client()
    try:
        res = (
            client.table("follows")
            .select("id")
            .eq("follower_id", follower_id)
            .eq("following_id", following_id)
            .execute()
        )
        if res.data is not None:
            return len(res.data) > 0
    except Exception:
        pass

    local_data = _load_local_follows()
    return any(
        f.get("follower_id") == follower_id and f.get("following_id") == following_id
        for f in local_data
    )


def count_followers(user_id: str) -> int:
    """
    Count how many users are following user_id (Followers count).
    """
    client = get_supabase_client()
    try:
        res = (
            client.table("follows")
            .select("id", count="exact")
            .eq("following_id", user_id)
            .execute()
        )
        if res.count is not None:
            return res.count
        if res.data is not None:
            return len(res.data)
    except Exception:
        pass

    local_data = _load_local_follows()
    return sum(1 for f in local_data if f.get("following_id") == user_id)


def count_following(user_id: str) -> int:
    """
    Count how many users user_id is following (Following count).
    """
    client = get_supabase_client()
    try:
        res = (
            client.table("follows")
            .select("id", count="exact")
            .eq("follower_id", user_id)
            .execute()
        )
        if res.count is not None:
            return res.count
        if res.data is not None:
            return len(res.data)
    except Exception:
        pass

    local_data = _load_local_follows()
    return sum(1 for f in local_data if f.get("follower_id") == user_id)


def add_follow(follower_id: str, following_id: str) -> dict:
    """
    Add a new follow entry with follower_id and following_id.
    """
    if is_following(follower_id, following_id):
        return {"follower_id": follower_id, "following_id": following_id, "status": "already_following"}

    now_iso = datetime.now(timezone.utc).isoformat()
    new_entry = {
        "id": str(uuid.uuid4()),
        "follower_id": follower_id,
        "following_id": following_id,
        "created_at": now_iso,
    }

    client = get_supabase_client()
    try:
        res = client.table("follows").insert(new_entry).execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.info(f"Supabase follows table insert fallback: {e}")

    local_data = _load_local_follows()
    local_data.append(new_entry)
    _save_local_follows(local_data)
    return new_entry


def remove_follow(follower_id: str, following_id: str) -> bool:
    """
    Remove a follow entry (unfollow).
    """
    client = get_supabase_client()
    try:
        client.table("follows").delete().eq("follower_id", follower_id).eq("following_id", following_id).execute()
    except Exception:
        pass

    local_data = _load_local_follows()
    updated = [
        f for f in local_data
        if not (f.get("follower_id") == follower_id and f.get("following_id") == following_id)
    ]
    _save_local_follows(updated)
    return True
