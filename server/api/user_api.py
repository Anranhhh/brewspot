"""
User API — request parsing and response encapsulation for user profiles.
"""

import logging
from flask import Blueprint, request, jsonify
from server.repositories import user_repository
from server.services import post_service, cafe_service, auth_service, user_service

logger = logging.getLogger(__name__)
user_bp = Blueprint("users", __name__, url_prefix="/api/users")


def _get_current_user_id() -> str | None:
    """
    Extract and validate the current user from the Authorization header.
    Returns the user ID or None if unauthenticated.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        user_id = auth_service.get_authenticated_user_id(token)
        if user_id:
            return user_id

    return None


@user_bp.route("/<user_id>", methods=["GET"])
def get_user(user_id: str):
    """
    Get a user's public profile.
    GET /api/users/:id
    """
    current_user_id = _get_current_user_id()
    profile = user_service.get_user_profile_data(user_id, current_user_id)
    return jsonify(profile), 200


@user_bp.route("/me", methods=["PUT"])
def update_current_user_profile():
    """
    Update authenticated user's profile.
    PUT /api/users/me
    Body JSON: { display_name, username, bio, avatar_type, avatar_path }
    """
    current_user_id = _get_current_user_id()
    if not current_user_id:
        return jsonify({"error": "Authentication required"}), 401

    data = request.get_json() or {}
    try:
        updated_profile = user_repository.update_user_profile(current_user_id, data)
        return jsonify({"success": True, "user": updated_profile}), 200
    except ValueError as e:
        error_msg = str(e)
        status_code = 409 if "already taken" in error_msg.lower() else 400
        return jsonify({"error": error_msg}), status_code


@user_bp.route("/<user_id>/follow", methods=["POST"])
def toggle_follow(user_id: str):
    """
    Toggle follow on a user.
    POST /api/users/:id/follow
    """
    current_user_id = _get_current_user_id()
    if not current_user_id:
        return jsonify({"error": "Authentication required"}), 401

    try:
        result = user_service.toggle_follow_user(current_user_id, user_id)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@user_bp.route("/<user_id>/posts", methods=["GET"])
def get_user_posts(user_id: str):
    """
    Get all posts by a specific user.
    GET /api/users/:id/posts
    """
    current_user_id = _get_current_user_id()
    posts = post_service.get_user_posts(user_id, current_user_id)
    return jsonify(posts), 200


@user_bp.route("/<user_id>/liked-posts", methods=["GET"])
def get_liked_posts(user_id: str):
    """
    Get posts liked by the authenticated profile owner.
    GET /api/users/:id/liked-posts
    """
    current_user_id = _get_current_user_id()
    if current_user_id != user_id:
        return jsonify({"error": "Authentication required"}), 401

    posts = post_service.get_liked_posts(user_id)
    return jsonify(posts), 200


@user_bp.route("/<user_id>/saved-posts", methods=["GET"])
def get_saved_posts(user_id: str):
    """
    Get posts saved by the authenticated profile owner.
    GET /api/users/:id/saved-posts
    """
    current_user_id = _get_current_user_id()
    if current_user_id != user_id:
        return jsonify({"error": "Authentication required"}), 401

    posts = post_service.get_saved_posts(user_id)
    return jsonify(posts), 200


@user_bp.route("/<user_id>/saved-cafes", methods=["GET"])
def get_saved_cafes(user_id: str):
    """
    Get cafes saved by the authenticated profile owner.
    GET /api/users/:id/saved-cafes
    """
    current_user_id = _get_current_user_id()
    if current_user_id != user_id:
        return jsonify({"error": "Authentication required"}), 401

    cafes = cafe_service.get_saved_cafes(user_id)
    return jsonify(cafes), 200
