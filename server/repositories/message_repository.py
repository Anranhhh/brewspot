"""
Messaging and Notifications repository - database access logic.
"""

import re
import logging
import uuid
import datetime
from server.supabase_client import get_supabase_client
from server.repositories import user_repository

logger = logging.getLogger(__name__)

# In-memory storage fallback for messages so chat history is guaranteed across requests
_in_memory_messages: list[dict] = []

UUID_REGEX = re.compile(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')


def _resolve_or_create_user_id(identifier: str, display_name: str | None = None, profile_avatar: str | None = None) -> str:
    """
    Ensure the identifier is a valid UUID present in Supabase users table.
    If identifier is a user display name (like 'Sophia Vance'), lookup or auto-create a user record.
    """
    client = get_supabase_client()
    identifier = str(identifier).strip()
    name_to_use = display_name or identifier

    # 1. Check if identifier is already a valid UUID
    if UUID_REGEX.match(identifier):
        try:
            res = client.table("users").select("id").eq("id", identifier).execute()
            if res.data:
                return res.data[0]["id"]
        except Exception:
            pass

        # Create user record in Supabase users table if missing
        try:
            payload: dict = {"id": identifier, "name": name_to_use}
            if profile_avatar:
                payload["profile"] = profile_avatar
            client.table("users").insert(payload).execute()
            return identifier
        except Exception:
            return identifier

    # 2. Identifier is a string name (e.g. "Sophia Vance" or "Alex Chen")
    try:
        res = client.table("users").select("*").ilike("name", identifier).execute()
        if res.data:
            return res.data[0]["id"]
    except Exception as e:
        logger.warning(f"Failed to lookup user by name '{identifier}': {e}")

    # 3. Generate deterministic UUID and insert user record into Supabase
    gen_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, identifier.lower()))
    try:
        payload = {"id": gen_uuid, "name": name_to_use}
        if profile_avatar:
            payload["profile"] = profile_avatar
        client.table("users").insert(payload).execute()
        logger.info(f"Created new user record in Supabase for '{identifier}' with UUID '{gen_uuid}'")
    except Exception as e:
        logger.warning(f"Note creating user for '{identifier}': {e}")

    return gen_uuid


def get_notifications(user_id: str) -> list[dict]:
    client = get_supabase_client()
    try:
        response = client.table("notifications").select("*, actor:users!actor_id(name, profile)").eq("user_id", user_id).order("created_at", desc=True).execute()
        return response.data or []
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
    """
    Fetch all direct messages for user_id from Supabase and in-memory cache.
    Returns deduplicated list sorted by created_at desc.
    """
    client = get_supabase_client()
    db_messages: list[dict] = []

    # 1. Fetch from Supabase direct_messages table
    try:
        response = client.table("direct_messages").select("*").or_(f"sender_id.eq.{user_id},receiver_id.eq.{user_id}").order("created_at", desc=True).execute()
        if response.data:
            db_messages = response.data
    except Exception as e:
        logger.warning(f"Supabase direct_messages select error: {e}")

    # 2. Combine with in-memory messages
    combined_map: dict[str, dict] = {}
    
    for m in db_messages + _in_memory_messages:
        s_id = m.get("sender_id")
        r_id = m.get("receiver_id")
        if s_id == user_id or r_id == user_id or s_id == str(user_id) or r_id == str(user_id):
            mid = m.get("id") or f"{s_id}-{r_id}-{m.get('created_at')}"
            
            # Enrich user profile info if missing
            if not m.get("sender"):
                sender_user = user_repository.get_user_by_id(s_id) if s_id else None
                m["sender"] = {
                    "id": s_id,
                    "name": sender_user.get("name", "User") if sender_user else s_id,
                    "profile": sender_user.get("profile") if sender_user else None
                }
            if not m.get("receiver"):
                receiver_user = user_repository.get_user_by_id(r_id) if r_id else None
                m["receiver"] = {
                    "id": r_id,
                    "name": receiver_user.get("name", "User") if receiver_user else r_id,
                    "profile": receiver_user.get("profile") if receiver_user else None
                }

            combined_map[mid] = m

    result_list = list(combined_map.values())
    result_list.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return result_list


def get_conversation(user_id: str, other_user_id: str) -> list[dict]:
    """
    Fetch all messages exchanged between user_id and other_user_id.
    """
    all_msgs = get_direct_messages(user_id)
    conv = [
        m for m in all_msgs
        if (m.get("sender_id") == user_id and (m.get("receiver_id") == other_user_id or m.get("receiver", {}).get("name") == other_user_id)) or
           ((m.get("sender_id") == other_user_id or m.get("sender", {}).get("name") == other_user_id) and m.get("receiver_id") == user_id)
    ]
    conv.sort(key=lambda x: x.get("created_at", ""))
    return conv


def create_direct_message(sender_id: str, receiver_id: str, text: str) -> dict | None:
    client = get_supabase_client()
    now_iso = datetime.datetime.utcnow().isoformat()
    msg_id = str(uuid.uuid4())

    # Resolve sender_id and receiver_id into valid Supabase UUIDs
    resolved_sender = _resolve_or_create_user_id(sender_id)
    resolved_receiver = _resolve_or_create_user_id(receiver_id)

    sender_user = user_repository.get_user_by_id(resolved_sender)
    receiver_user = user_repository.get_user_by_id(resolved_receiver)

    sender_info = {
        "id": resolved_sender,
        "name": sender_user.get("name", "You") if sender_user else "You",
        "profile": sender_user.get("profile") if sender_user else None
    }
    receiver_info = {
        "id": resolved_receiver,
        "name": receiver_user.get("name", receiver_id) if receiver_user else receiver_id,
        "profile": receiver_user.get("profile") if receiver_user else None
    }

    payload = {
        "id": msg_id,
        "sender_id": resolved_sender,
        "receiver_id": resolved_receiver,
        "text": text,
        "created_at": now_iso
    }

    created = None
    try:
        response = client.table("direct_messages").insert(payload).execute()
        if response.data:
            created = response.data[0]
            logger.info(f"Inserted message {msg_id} into Supabase direct_messages successfully!")
    except Exception as e:
        logger.error(f"Error inserting into Supabase direct_messages table: {e}")

    if not created:
        created = payload

    created["sender"] = sender_info
    created["receiver"] = receiver_info

    # Save into in-memory store as secondary backup
    _in_memory_messages.append(created)
    return created
