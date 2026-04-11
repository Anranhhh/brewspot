"""
Auth API — request parsing and response encapsulation for authentication.
"""

import logging
from flask import Blueprint, request, jsonify
from pydantic import ValidationError
from server.schemas import LoginRequest, RegisterRequest
from server.services import auth_service

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Register a new user.
    POST /api/auth/register
    Body: { email, password, name }
    """
    try:
        body = RegisterRequest(**request.get_json())
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    try:
        result = auth_service.register(body.email, body.password, body.name)
        return jsonify(result), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error("Registration error: %s", e)
        return jsonify({"error": "Internal server error"}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Login with email and password.
    POST /api/auth/login
    Body: { email, password }
    """
    try:
        body = LoginRequest(**request.get_json())
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    try:
        result = auth_service.login(body.email, body.password)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 401
    except Exception as e:
        logger.error("Login error: %s", e)
        return jsonify({"error": "Internal server error"}), 500


@auth_bp.route("/me", methods=["GET"])
def get_me():
    """
    Get current user profile from Authorization header.
    GET /api/auth/me
    """
    token = _extract_token()
    if not token:
        return jsonify({"error": "Authorization header required"}), 401

    user = auth_service.get_current_user(token)
    if not user:
        return jsonify({"error": "Invalid or expired token"}), 401

    return jsonify({"user": user}), 200


def _extract_token() -> str | None:
    """
    Extract Bearer token from the Authorization header.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None
