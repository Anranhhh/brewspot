"""
Post repository — database access for posts, post_likes, saved_posts,
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
    try:
        response = (
            client.table("posts")
            .select("*, profiles!posts_user_id_fkey(id, username, display_name, avatar_url)")
            .order("created_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as e:
        logger.warning(f"Failed to fetch posts with profiles fkey: {e}. Trying fallback.")
        response = (
            client.table("posts")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        return response.data


def get_post_by_id(post_id: str) -> dict | None:
    """
    Fetch a single post by UUID, including author profile info.
    @param post_id Post UUID
    @returns post dict or None
    """
    client = get_supabase_client()
    try:
        response = (
            client.table("posts")
            .select("*, profiles!posts_user_id_fkey(id, username, display_name, avatar_url)")
            .eq("id", post_id)
            .execute()
        )
        if response.data:
            return response.data[0]
    except Exception:
        response = client.table("posts").select("*").eq("id", post_id).execute()
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
    try:
        response = (
            client.table("posts")
            .select("*, profiles!posts_user_id_fkey(id, username, display_name, avatar_url)")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data
    except Exception:
        response = (
            client.table("posts")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data


def get_posts_by_ids(post_ids: list[str]) -> list[dict]:
    """
    Fetch posts by ID list.
    @param post_ids Post UUIDs
    @returns list of post dicts
    """
    if not post_ids:
        return []
    client = get_supabase_client()
    try:
        response = (
            client.table("posts")
            .select("*, profiles!posts_user_id_fkey(id, username, display_name, avatar_url)")
            .in_("id", post_ids)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data
    except Exception:
        response = (
            client.table("posts")
            .select("*")
            .in_("id", post_ids)
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
    google_place_id: str | None = None,
) -> dict:
    """
    Insert a new post record into public.posts.
    """
    client = get_supabase_client()
    payload: dict = {"user_id": user_id, "image_url": image_url}
    if location:
        payload["location"] = location
    if rating is not None:
        payload["rating"] = rating
    if caption:
        payload["caption"] = caption
    if google_place_id:
        payload["google_place_id"] = google_place_id

    response = client.table("posts").insert(payload).execute()
    return response.data[0]


def delete_post(post_id: str) -> bool:
    """
    Delete a post and associated likes, saved posts, and comments.
    """
    client = get_supabase_client()
    try:
        client.table("post_likes").delete().eq("post_id", post_id).execute()
        client.table("saved_posts").delete().eq("post_id", post_id).execute()
        client.table("comments").delete().eq("post_id", post_id).execute()
    except Exception as e:
        logger.warning(f"Error cleaning up post associations for {post_id}: {e}")

    client.table("posts").delete().eq("id", post_id).execute()
    return True


# --- Post Stats ---

def get_post_stats(post_id: str) -> dict:
    """
    Fetch aggregate stats (likes, saves, comments) from database.
    """
    client = get_supabase_client()
    try:
        likes_res = client.table("post_likes").select("user_id", count="exact").eq("post_id", post_id).execute()
        try:
            saves_res = client.table("saved_posts").select("user_id", count="exact").eq("post_id", post_id).execute()
        except Exception:
            # Legacy schema uses post_saves.
            saves_res = client.table("post_saves").select("user_id", count="exact").eq("post_id", post_id).execute()
        comments_res = client.table("comments").select("id", count="exact").eq("post_id", post_id).execute()
        
        return {
            "post_id": post_id,
            "likes_count": likes_res.count if likes_res.count is not None else len(likes_res.data),
            "saves_count": saves_res.count if saves_res.count is not None else len(saves_res.data),
            "comments_count": comments_res.count if comments_res.count is not None else len(comments_res.data),
        }
    except Exception:
        return {"post_id": post_id, "likes_count": 0, "saves_count": 0, "comments_count": 0}


def get_bulk_post_stats(post_ids: list[str]) -> dict[str, dict]:
    """
    Fetch stats for multiple posts at once.
    """
    if not post_ids:
        return {}
    res_map: dict[str, dict] = {}
    for pid in post_ids:
        res_map[pid] = get_post_stats(pid)
    return res_map


# --- Likes ---

def is_post_liked(user_id: str, post_id: str) -> bool:
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
    client = get_supabase_client()
    if is_post_liked(user_id, post_id):
        client.table("post_likes").delete().eq("user_id", user_id).eq("post_id", post_id).execute()
        return False
    else:
        client.table("post_likes").insert({"user_id": user_id, "post_id": post_id}).execute()
        return True


def get_liked_post_ids(user_id: str) -> list[str]:
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
    client = get_supabase_client()
    try:
        response = client.table("saved_posts").select("user_id").eq("user_id", user_id).eq("post_id", post_id).execute()
    except Exception:
        response = client.table("post_saves").select("user_id").eq("user_id", user_id).eq("post_id", post_id).execute()
    return len(response.data) > 0


def toggle_post_save(user_id: str, post_id: str) -> bool:
    client = get_supabase_client()
    if is_post_saved(user_id, post_id):
        try:
            client.table("saved_posts").delete().eq("user_id", user_id).eq("post_id", post_id).execute()
        except Exception:
            client.table("post_saves").delete().eq("user_id", user_id).eq("post_id", post_id).execute()
        return False
    else:
        try:
            client.table("saved_posts").insert({"user_id": user_id, "post_id": post_id}).execute()
        except Exception:
            client.table("post_saves").insert({"user_id": user_id, "post_id": post_id}).execute()
        return True


def get_saved_post_ids(user_id: str) -> list[str]:
    client = get_supabase_client()
    try:
        response = client.table("saved_posts").select("post_id").eq("user_id", user_id).execute()
    except Exception:
        response = client.table("post_saves").select("post_id").eq("user_id", user_id).execute()
    return [row["post_id"] for row in response.data]


# --- Comments ---

def get_comments_for_post(post_id: str) -> list[dict]:
    client = get_supabase_client()
    try:
        response = (
            client.table("comments")
            .select("*, profiles!comments_user_id_fkey(id, username, display_name, avatar_url)")
            .eq("post_id", post_id)
            .order("created_at", desc=False)
            .execute()
        )
        return response.data
    except Exception:
        response = (
            client.table("comments")
            .select("*")
            .eq("post_id", post_id)
            .order("created_at", desc=False)
            .execute()
        )
        return response.data


def create_comment(post_id: str, user_id: str, text: str, parent_id: str | None = None) -> dict:
    client = get_supabase_client()
    payload = {"post_id": post_id, "user_id": user_id, "body": text}
    if parent_id:
        payload["parent_id"] = parent_id

    try:
        response = client.table("comments").insert(payload).execute()
    except Exception as e:
        if "body" in str(e):
            payload["text"] = text
            payload.pop("body", None)
            response = client.table("comments").insert(payload).execute()
        else:
            raise e

    inserted = response.data[0]
    comment_id = inserted.get("id")
    if comment_id:
        try:
            res = (
                client.table("comments")
                .select("*, profiles!comments_user_id_fkey(id, username, display_name, avatar_url)")
                .eq("id", comment_id)
                .execute()
            )
            if res.data:
                return res.data[0]
        except Exception:
            pass

    return inserted


def get_comment_by_id(comment_id: str) -> dict | None:
    client = get_supabase_client()
    try:
        response = (
            client.table("comments")
            .select("*, profiles!comments_user_id_fkey(id, username, display_name, avatar_url)")
            .eq("id", comment_id)
            .execute()
        )
        if response.data:
            return response.data[0]
    except Exception:
        response = client.table("comments").select("*").eq("id", comment_id).execute()
        if response.data:
            return response.data[0]
    return None


def delete_comment_by_id(comment_id: str) -> bool:
    client = get_supabase_client()
    client.table("comments").delete().eq("id", comment_id).execute()
    return True
