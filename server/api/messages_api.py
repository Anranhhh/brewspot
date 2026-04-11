"""
Messaging and Notifications API.
"""

import logging
from flask import Blueprint, request, jsonify
from server.services import auth_service
from server.repositories import message_repository

logger = logging.getLogger(__name__)
messages_bp = Blueprint("messages", __name__, url_prefix="/api")


def _get_user_from_request():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        return auth_service.get_current_user(token)
    return None


@messages_bp.route("/notifications", methods=["GET"])
def get_notifications():
    user = _get_user_from_request()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    notifications = message_repository.get_notifications(user["id"])
    return jsonify(notifications), 200


@messages_bp.route("/messages", methods=["GET"])
def get_direct_messages():
    user = _get_user_from_request()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    messages = message_repository.get_direct_messages(user["id"])
    return jsonify(messages), 200


@messages_bp.route("/messages", methods=["POST"])
def send_message():
    user = _get_user_from_request()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    body = request.get_json()
    if not body or "receiver_id" not in body or "text" not in body:
        return jsonify({"error": "receiver_id and text required"}), 400

    msg = message_repository.create_direct_message(
        sender_id=user["id"],
        receiver_id=body["receiver_id"],
        text=body["text"]
    )
    if msg:
        return jsonify(msg), 201
    return jsonify({"error": "Failed to create message"}), 500
