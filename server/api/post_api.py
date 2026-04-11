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
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    user = auth_service.get_current_user(token)
    return user["id"] if user else None


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
    Body: { text }
    """
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    try:
        body = CreateCommentRequest(**request.get_json())
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    comment = post_service.add_comment(post_id, user_id, body.text)
    return jsonify(comment), 201
