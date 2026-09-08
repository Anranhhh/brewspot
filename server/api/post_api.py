"""
Post API — request parsing and response encapsulation for posts,
likes, saves, and comments.
"""

import logging
from flask import Blueprint, request, jsonify
from pydantic import ValidationError
from server.schemas import CreatePostRequest, CreateCommentRequest
from server.services import post_service, auth_service

logger = logging.getLogger(__name__)
post_bp = Blueprint("posts", __name__, url_prefix="/api/posts")


def _get_current_user_id() -> str | None:
    """
    Extract and validate the current user from the Authorization header.
    Returns the user ID or None if unauthenticated.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        user = auth_service.get_current_user(token)
        if user:
            return user["id"]

    return None


@post_bp.route("", methods=["GET"])
def list_posts():
    """
    List all posts (discovery feed).
    GET /api/posts
    """
    user_id = _get_current_user_id()
    posts = post_service.get_feed_posts(user_id)
    return jsonify(posts), 200


@post_bp.route("/<post_id>", methods=["GET"])
def get_post(post_id: str):
    """
    Get a single post by ID.
    GET /api/posts/:id
    """
    user_id = _get_current_user_id()
    post = post_service.get_post_detail(post_id, user_id)
    if not post:
        return jsonify({"error": "Post not found"}), 404
    return jsonify(post), 200


@post_bp.route("", methods=["POST"])
def create_post():
    """
    Create a new post. Requires authentication.
    POST /api/posts
    Body: { image_url, location?, rating?, caption? }
    """
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    try:
        body = CreatePostRequest(**request.get_json())
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    post = post_service.create_post(
        user_id=user_id,
        image_url=body.image_url,
        location=body.location,
        rating=body.rating,
        caption=body.caption,
    )
    return jsonify(post), 201


@post_bp.route("/<post_id>", methods=["DELETE"])
def delete_post(post_id: str):
    """
    Delete a post. Requires authentication & author permission.
    DELETE /api/posts/:id
    """
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    try:
        result = post_service.delete_post(user_id, post_id)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        logger.error(f"Error deleting post {post_id}: {e}")
        return jsonify({"error": "Failed to delete post"}), 500


@post_bp.route("/<post_id>/like", methods=["POST"])
def toggle_like(post_id: str):
    """
    Toggle like on a post. Requires authentication.
    POST /api/posts/:id/like
    """
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    result = post_service.toggle_like(user_id, post_id)
    return jsonify(result), 200


@post_bp.route("/<post_id>/save", methods=["POST"])
def toggle_save(post_id: str):
    """
    Toggle save on a post. Requires authentication.
    POST /api/posts/:id/save
    """
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    result = post_service.toggle_save(user_id, post_id)
    return jsonify(result), 200


@post_bp.route("/<post_id>/comments", methods=["GET"])
def get_comments(post_id: str):
    """
    Get all comments for a post.
    GET /api/posts/:id/comments
    """
    comments = post_service.get_comments(post_id)
    return jsonify(comments), 200


@post_bp.route("/<post_id>/comments", methods=["POST"])
def add_comment(post_id: str):
    """
    Add a comment to a post. Requires authentication.
    POST /api/posts/:id/comments
    Body: { text, parent_id }
    """
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    try:
        body = CreateCommentRequest(**request.get_json())
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    comment = post_service.add_comment(post_id, user_id, body.text, parent_id=body.parent_id)
    return jsonify(comment), 201


@post_bp.route("/comments/<comment_id>", methods=["DELETE"])
def delete_comment(comment_id: str):
    """
    Delete a comment. Requires authentication & author permission.
    DELETE /api/posts/comments/:id
    """
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    try:
        result = post_service.delete_comment(user_id, comment_id)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403
    except Exception as e:
        logger.error(f"Error deleting comment {comment_id}: {e}")
        return jsonify({"error": "Failed to delete comment"}), 500
