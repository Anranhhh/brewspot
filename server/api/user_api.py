"""
User API — request parsing and response encapsulation for user profiles.
"""

import logging
from flask import Blueprint, request, jsonify
from server.repositories import user_repository
from server.services import post_service, auth_service

logger = logging.getLogger(__name__)
user_bp = Blueprint("users", __name__, url_prefix="/api/users")


def _get_current_user_id() -> str | None:
    """
    Extract and validate the current user from the Authorization header.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    user = auth_service.get_current_user(token)
    return user["id"] if user else None


@user_bp.route("/<user_id>", methods=["GET"])
def get_user(user_id: str):
    """
    Get a user's public profile.
    GET /api/users/:id
    """
    user = user_repository.get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user), 200


@user_bp.route("/<user_id>/posts", methods=["GET"])
def get_user_posts(user_id: str):
    """
    Get all posts by a specific user.
    GET /api/users/:id/posts
    """
    current_user_id = _get_current_user_id()
    posts = post_service.get_user_posts(user_id, current_user_id)
    return jsonify(posts), 200
