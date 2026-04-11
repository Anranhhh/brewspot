"""
Messaging and Notifications repository - database access logic.
"""

import logging
from server.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


def get_notifications(user_id: str) -> list[dict]:
    client = get_supabase_client()
    # Supabase PostgREST allows joining on foreign keys
    try:
        response = client.table("notifications").select("*, actor:users!actor_id(name, profile)").eq("user_id", user_id).order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        return []


def create_notification(user_id: str, action: str, text: str = "", target: str | None = None, actor_id: str | None = None, system: bool = False) -> dict | None:
    client = get_supabase_client()
    payload = {
        "user_id": user_id,
        "action": action,
        "text": text,
        "target": target,
        "actor_id": actor_id,
        "system": system
    }
    try:
        response = client.table("notifications").insert(payload).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        return None


def get_direct_messages(user_id: str) -> list[dict]:
    client = get_supabase_client()
    # Fetch all messages where user is either sender or receiver
    try:
        response = client.table("direct_messages").select("*, sender:users!sender_id(name, profile), receiver:users!receiver_id(name, profile)").or_(f"sender_id.eq.{user_id},receiver_id.eq.{user_id}").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching direct messages: {e}")
        return []


def create_direct_message(sender_id: str, receiver_id: str, text: str) -> dict | None:
    client = get_supabase_client()
    payload = {
        "sender_id": sender_id,
        "receiver_id": receiver_id,
        "text": text
    }
    try:
        response = client.table("direct_messages").insert(payload).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error creating message: {e}")
        return None
