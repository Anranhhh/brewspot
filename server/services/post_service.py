"""
Post service — business logic for posts, likes, saves, and comments.
"""

import logging
from datetime import datetime, timezone
from server.repositories import post_repository, user_repository

logger = logging.getLogger(__name__)


def get_feed_posts(user_id: str | None = None) -> list[dict]:
    """
    Get all posts for the discovery feed, annotated with user interaction state.
    @param user_id Optional user UUID for like/save state
    @returns list of formatted post dicts
    """
    posts = post_repository.get_all_posts()
    post_ids = [p["id"] for p in posts]

    # Batch-fetch stats and user interaction state
    stats_map = post_repository.get_bulk_post_stats(post_ids)
    liked_ids: set[str] = set()
    saved_ids: set[str] = set()
    if user_id:
        liked_ids = set(post_repository.get_liked_post_ids(user_id))
        saved_ids = set(post_repository.get_saved_post_ids(user_id))

    return [
        _format_post(
            post,
            stats_map.get(post["id"], {}),
            post["id"] in liked_ids,
            post["id"] in saved_ids,
        )
        for post in posts
    ]


def get_user_posts(user_id: str, current_user_id: str | None = None) -> list[dict]:
    """
    Get all posts by a specific user.
    @param user_id Target user UUID
    @param current_user_id Optional current user for like/save state
    @returns list of formatted post dicts
    """
    posts = post_repository.get_posts_by_user(user_id)
    post_ids = [p["id"] for p in posts]

    stats_map = post_repository.get_bulk_post_stats(post_ids)
    liked_ids: set[str] = set()
    saved_ids: set[str] = set()
    if current_user_id:
        liked_ids = set(post_repository.get_liked_post_ids(current_user_id))
        saved_ids = set(post_repository.get_saved_post_ids(current_user_id))

    return [
        _format_post(
            post,
            stats_map.get(post["id"], {}),
            post["id"] in liked_ids,
            post["id"] in saved_ids,
        )
        for post in posts
    ]


def get_post_detail(post_id: str, user_id: str | None = None) -> dict | None:
    """
    Get a single post with full stats and interaction state.
    @param post_id Post UUID
    @param user_id Optional user UUID
    @returns formatted post dict or None
    """
    post = post_repository.get_post_by_id(post_id)
    if not post:
        return None

    stats = post_repository.get_post_stats(post_id)
    is_liked = False
    is_saved = False
    if user_id:
        is_liked = post_repository.is_post_liked(user_id, post_id)
        is_saved = post_repository.is_post_saved(user_id, post_id)

    return _format_post(post, stats, is_liked, is_saved)


def create_post(
    user_id: str,
    image_url: str,
    location: str | None = None,
    rating: float | None = None,
    caption: str | None = None,
) -> dict:
    """
    Create a new post and return it formatted.
    @param user_id Author UUID
    @param image_url Post image URL
    @param location Optional location text
    @param rating Optional aesthetic rating
    @param caption Optional caption
    @returns formatted post dict
    """
    post = post_repository.create_post(user_id, image_url, location, rating, caption)
    stats = {"likes_count": 0, "saves_count": 0, "comments_count": 0}
    return _format_post(post, stats, False, False)


def toggle_like(user_id: str, post_id: str) -> dict:
    """
    Toggle like on a post.
    @param user_id User UUID
    @param post_id Post UUID
    @returns dict with isLiked state and updated likes count
    """
    is_liked = post_repository.toggle_post_like(user_id, post_id)
    stats = post_repository.get_post_stats(post_id)
    return {"isLiked": is_liked, "likes": stats.get("likes_count", 0)}


def toggle_save(user_id: str, post_id: str) -> dict:
    """
    Toggle save on a post.
    @param user_id User UUID
    @param post_id Post UUID
    @returns dict with isSaved state and updated saves count
    """
    is_saved = post_repository.toggle_post_save(user_id, post_id)
    stats = post_repository.get_post_stats(post_id)
    return {"isSaved": is_saved, "saves": stats.get("saves_count", 0)}


def get_comments(post_id: str) -> list[dict]:
    """
    Get all comments for a post, formatted for the frontend.
    @param post_id Post UUID
    @returns list of formatted comment dicts
    """
    comments = post_repository.get_comments_for_post(post_id)
    return [_format_comment(c) for c in comments]


def add_comment(post_id: str, user_id: str, text: str) -> dict:
    """
    Add a comment to a post.
    @param post_id Post UUID
    @param user_id Commenter UUID
    @param text Comment text
    @returns formatted comment dict
    """
    comment = post_repository.create_comment(post_id, user_id, text)
    # Fetch with author info for the response
    user = user_repository.get_user_by_id(user_id)
    comment["users"] = user
    return _format_comment(comment)


def _format_post(post: dict, stats: dict, is_liked: bool, is_saved: bool) -> dict:
    """
    Transform DB post + stats into frontend camelCase format.
    """
    author = post.get("users")
    timestamp = _relative_time(post.get("created_at"))

    return {
        "id": post["id"],
        "imageUrl": post.get("image_url", ""),
        "author": {
            "name": author.get("name", "unknown") if author else "unknown",
            "profile": (author.get("profile") or author.get("avatar") or "") if author else "",
        } if author else None,
        "location": post.get("location"),
        "rating": float(post["rating"]) if post.get("rating") else None,
        "likes": stats.get("likes_count", 0),
        "comments": stats.get("comments_count", 0),
        "saves": stats.get("saves_count", 0),
        "isLiked": is_liked,
        "isSaved": is_saved,
        "timestamp": timestamp,
        "caption": post.get("caption"),
    }


def _format_comment(comment: dict) -> dict:
    """
    Transform DB comment into frontend format.
    """
    author = comment.get("users")
    return {
        "id": comment["id"],
        "text": comment["text"],
        "author": {
            "name": author.get("name", "unknown") if author else "unknown",
            "profile": (author.get("profile") or author.get("avatar") or "") if author else "",
        },
        "timestamp": _relative_time(comment.get("created_at")),
    }


def _relative_time(iso_str: str | None) -> str:
    """
    Convert an ISO timestamp to a human-readable relative time string.
    """
    if not iso_str:
        return "just now"
    try:
        # Handle Supabase timestamp format
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff = now - dt
        seconds = diff.total_seconds()

        if seconds < 60:
            return "just now"
        elif seconds < 3600:
            mins = int(seconds / 60)
            return f"{mins} minute{'s' if mins != 1 else ''} ago"
        elif seconds < 86400:
            hours = int(seconds / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif seconds < 604800:
            days = int(seconds / 86400)
            return f"{days} day{'s' if days != 1 else ''} ago"
        else:
            weeks = int(seconds / 604800)
            return f"{weeks} week{'s' if weeks != 1 else ''} ago"
    except (ValueError, TypeError):
        return "just now"
