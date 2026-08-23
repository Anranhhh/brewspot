"""
User Service — Business logic for user profiles, follows, and user relationships.
Uses dedicated follow entries (follower_id, following_id, created_at, id).
"""

import logging
from server.repositories import user_repository, post_repository, follow_repository

logger = logging.getLogger(__name__)


def get_user_profile_data(target_identifier: str, current_user_id: str | None = None) -> dict:
    """
    Get public user profile information including follower and following counts.
    Initial users have 0 followers and 0 followings.
    @param target_identifier Target user UUID or display name
    @param current_user_id Current authenticated user UUID
    @returns profile dictionary
    """
    user = user_repository.find_user(target_identifier)
    target_user_id = user.get("id") if user else target_identifier
    name = user.get("name", "User") if user else target_identifier
    profile_pic = user.get("profile") if user else None

    # Count user's posts
    user_posts = post_repository.get_posts_by_user(target_user_id)
    posts_count = len(user_posts)

    # Count real followers & following from dedicated follow entries
    followers_count = follow_repository.count_followers(target_user_id)
    following_count = follow_repository.count_following(target_user_id)

    is_following = False
    if current_user_id:
        is_following = follow_repository.is_following(current_user_id, target_user_id)

    return {
        "id": target_user_id,
        "name": name,
        "profile": profile_pic,
        "postsCount": posts_count,
        "followersCount": followers_count,
        "followingCount": following_count,
        "isFollowing": is_following,
    }


def toggle_follow_user(follower_id: str, target_identifier: str) -> dict:
    """
    Toggle follow status for a target user.
    Creates or removes dedicated follow record with follower_id & following_id.
    @param follower_id Authenticated follower user UUID
    @param target_identifier User UUID or display name to follow or unfollow
    @returns dict with updated isFollowing and followersCount
    """
    user = user_repository.find_user(target_identifier)
    target_user_id = user.get("id") if user else target_identifier

    if follower_id == target_user_id:
        raise ValueError("You cannot follow yourself")

    currently_following = follow_repository.is_following(follower_id, target_user_id)
    if currently_following:
        follow_repository.remove_follow(follower_id, target_user_id)
        is_following = False
    else:
        follow_repository.add_follow(follower_id, target_user_id)
        is_following = True

    # Recalculate real followers count from dedicated follow entries
    followers_count = follow_repository.count_followers(target_user_id)

    return {
        "userId": target_user_id,
        "isFollowing": is_following,
        "followersCount": followers_count,
    }
