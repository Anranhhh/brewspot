"""
Post repository — database access for posts, post_likes, post_saves,
comments, and the post_stats view.
"""

import logging
from server.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


# --- Posts ---

def get_all_posts() -> list[dict]:
    """
    Fetch all posts ordered by newest first.
    @returns list of post dicts
    """
    client = get_supabase_client()
    response = (
        client.table("posts")
        .select("*, users!posts_user_id_fkey(id, name, profile)")
        .order("created_at", desc=True)
        .execute()
    )
    return response.data


def get_post_by_id(post_id: str) -> dict | None:
    """
    Fetch a single post by UUID, including author info.
    @param post_id Post UUID
    @returns post dict with nested user or None
    """
    client = get_supabase_client()
    response = (
        client.table("posts")
        .select("*, users!posts_user_id_fkey(id, name, profile)")
        .eq("id", post_id)
        .execute()
    )
    if response.data:
        return response.data[0]
    return None


def get_posts_by_user(user_id: str) -> list[dict]:
    """
    Fetch all posts by a specific user.
    @param user_id User UUID
    @returns list of post dicts
    """
    client = get_supabase_client()
    response = (
        client.table("posts")
        .select("*, users!posts_user_id_fkey(id, name, profile)")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data


def create_post(
    user_id: str,
    image_url: str,
    location: str | None = None,
    rating: float | None = None,
    caption: str | None = None,
) -> dict:
    """
    Insert a new post.
    @param user_id Author UUID
    @param image_url URL of the post image
    @param location Optional location text
    @param rating Optional aesthetic rating (0-5)
    @param caption Optional caption text
    @returns created post dict
    """
    client = get_supabase_client()
    payload: dict = {"user_id": user_id, "image_url": image_url}
    if location:
        payload["location"] = location
    if rating is not None:
        payload["rating"] = rating
    if caption:
        payload["caption"] = caption
    response = client.table("posts").insert(payload).execute()
    return response.data[0]


# --- Post Stats ---

def get_post_stats(post_id: str) -> dict:
    """
    Fetch aggregate stats (likes, saves, comments) from the post_stats view.
    @param post_id Post UUID
    @returns dict with likes_count, saves_count, comments_count
    """
    client = get_supabase_client()
    response = (
        client.table("post_stats")
        .select("*")
        .eq("post_id", post_id)
        .execute()
    )
    if response.data:
        return response.data[0]
    return {"post_id": post_id, "likes_count": 0, "saves_count": 0, "comments_count": 0}


def get_bulk_post_stats(post_ids: list[str]) -> dict[str, dict]:
    """
    Fetch stats for multiple posts at once.
    @param post_ids List of post UUIDs
    @returns dict mapping post_id to stats
    """
    if not post_ids:
        return {}
    client = get_supabase_client()
    response = (
        client.table("post_stats")
        .select("*")
        .in_("post_id", post_ids)
        .execute()
    )
    return {row["post_id"]: row for row in response.data}


# --- Likes ---

def is_post_liked(user_id: str, post_id: str) -> bool:
    """
    Check if a user has liked a post.
    @param user_id User UUID
    @param post_id Post UUID
    @returns True if liked
    """
    client = get_supabase_client()
    response = (
        client.table("post_likes")
        .select("user_id")
        .eq("user_id", user_id)
        .eq("post_id", post_id)
        .execute()
    )
    return len(response.data) > 0


def toggle_post_like(user_id: str, post_id: str) -> bool:
    """
    Toggle like state for a post. Returns new liked state.
    @param user_id User UUID
    @param post_id Post UUID
    @returns True if now liked, False if unliked
    """
    client = get_supabase_client()
    if is_post_liked(user_id, post_id):
        client.table("post_likes").delete().eq(
            "user_id", user_id
        ).eq("post_id", post_id).execute()
        return False
    else:
        client.table("post_likes").insert(
            {"user_id": user_id, "post_id": post_id}
        ).execute()
        return True


def get_liked_post_ids(user_id: str) -> list[str]:
    """
    Get all post IDs liked by a user.
    @param user_id User UUID
    @returns list of post ID strings
    """
    client = get_supabase_client()
    response = (
        client.table("post_likes")
        .select("post_id")
        .eq("user_id", user_id)
        .execute()
    )
    return [row["post_id"] for row in response.data]


# --- Saves ---

def is_post_saved(user_id: str, post_id: str) -> bool:
    """
    Check if a user has saved a post.
    @param user_id User UUID
    @param post_id Post UUID
    @returns True if saved
    """
    client = get_supabase_client()
    response = (
        client.table("post_saves")
        .select("user_id")
        .eq("user_id", user_id)
        .eq("post_id", post_id)
        .execute()
    )
    return len(response.data) > 0


def toggle_post_save(user_id: str, post_id: str) -> bool:
    """
    Toggle save state for a post. Returns new saved state.
    @param user_id User UUID
    @param post_id Post UUID
    @returns True if now saved, False if unsaved
    """
    client = get_supabase_client()
    if is_post_saved(user_id, post_id):
        client.table("post_saves").delete().eq(
            "user_id", user_id
        ).eq("post_id", post_id).execute()
        return False
    else:
        client.table("post_saves").insert(
            {"user_id": user_id, "post_id": post_id}
        ).execute()
        return True


def get_saved_post_ids(user_id: str) -> list[str]:
    """
    Get all post IDs saved by a user.
    @param user_id User UUID
    @returns list of post ID strings
    """
    client = get_supabase_client()
    response = (
        client.table("post_saves")
        .select("post_id")
        .eq("user_id", user_id)
        .execute()
    )
    return [row["post_id"] for row in response.data]


# --- Comments ---

def get_comments_for_post(post_id: str) -> list[dict]:
    """
    Fetch all comments for a post, with author info.
    @param post_id Post UUID
    @returns list of comment dicts
    """
    client = get_supabase_client()
    response = (
        client.table("comments")
        .select("*, users!comments_user_id_fkey(id, name, profile)")
        .eq("post_id", post_id)
        .order("created_at", desc=False)
        .execute()
    )
    return response.data


def create_comment(post_id: str, user_id: str, text: str) -> dict:
    """
    Insert a new comment on a post.
    @param post_id Post UUID
    @param user_id Commenter UUID
    @param text Comment text
    @returns created comment dict
    """
    client = get_supabase_client()
    response = (
        client.table("comments")
        .insert({"post_id": post_id, "user_id": user_id, "text": text})
        .execute()
    )
    return response.data[0]
