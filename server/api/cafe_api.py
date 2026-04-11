"""
Cafe API — request parsing and response encapsulation for cafes.
"""

import logging
from flask import Blueprint, request, jsonify
from server.services import cafe_service, auth_service

logger = logging.getLogger(__name__)
cafe_bp = Blueprint("cafes", __name__, url_prefix="/api/cafes")


def _get_current_user_id() -> str | None:
    """
    Extract and validate the current user from the Authorization header.
    Returns the user ID or None if not authenticated.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    user = auth_service.get_current_user(token)
    return user["id"] if user else None


@cafe_bp.route("", methods=["GET"])
def list_cafes():
    """
    List all cafes with save state for authenticated user.
    GET /api/cafes
    """
    user_id = _get_current_user_id()
    cafes = cafe_service.get_cafes(user_id)
    return jsonify(cafes), 200


@cafe_bp.route("/<cafe_id>", methods=["GET"])
def get_cafe(cafe_id: str):
    """
    Get a single cafe by ID.
    GET /api/cafes/:id
    """
    user_id = _get_current_user_id()
    cafe = cafe_service.get_cafe_detail(cafe_id, user_id)
    if not cafe:
        return jsonify({"error": "Cafe not found"}), 404
    return jsonify(cafe), 200


@cafe_bp.route("/<cafe_id>/save", methods=["POST"])
def toggle_save(cafe_id: str):
    """
    Toggle save on a cafe. Requires authentication.
    POST /api/cafes/:id/save
    """
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    result = cafe_service.toggle_save(user_id, cafe_id)
    return jsonify(result), 200
