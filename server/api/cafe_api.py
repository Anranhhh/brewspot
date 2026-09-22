"""
Cafe API — request parsing and response encapsulation for cafes.
"""

import logging
from flask import Blueprint, request, jsonify
from pydantic import ValidationError
from server.services import cafe_service, auth_service
from server.schemas import CreateCafeRequest

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


@cafe_bp.route("/search", methods=["GET"])
def search_cafes():
    query = (request.args.get("q") or "").strip()
    if len(query) < 2:
        return jsonify([]), 200
    return jsonify(cafe_service.search_cafes(query, _get_current_user_id())), 200


@cafe_bp.route("/trending", methods=["GET"])
def trending_cafes():
    return jsonify([cafe_service._format_cafe(c, False) for c in cafe_service.cafe_repository.get_trending_cafes()]), 200


@cafe_bp.route("", methods=["POST"])
def create_cafe():
    user_id = _get_current_user_id()
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401
    try:
        body = CreateCafeRequest(**(request.get_json(silent=True) or {}))
        cafe = cafe_service.create_google_cafe(user_id, body.dict())
        return jsonify(cafe), 201
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400
    except Exception as e:
        logger.exception("Failed to create cafe")
        return jsonify({"error": "Could not create cafe", "details": str(e)}), 500


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

    cafe_data = request.get_json(silent=True)
    try:
        result = cafe_service.toggle_save(user_id, cafe_id, cafe_data)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
