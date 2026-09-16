"""
Auth service — business logic for signup and login using Supabase Auth.
"""

import logging
from server.supabase_client import get_supabase_client, get_admin_client
from server.repositories import user_repository

logger = logging.getLogger(__name__)


def register(email: str, password: str, name: str) -> dict:
    """
    Register a new user via Supabase Auth, then create a profile row.
    Falls back to admin creation if email rate limits are encountered.
    @param email User email
    @param password User password (min 6 chars)
    @param name Display name
    @returns dict with access_token, user profile
    """
    client = get_supabase_client()
    auth_user = None
    session = None

    try:
        auth_response = client.auth.sign_up(
            {"email": email, "password": password, "options": {"data": {"name": name}}}
        )
        auth_user = auth_response.user
        session = auth_response.session
    except Exception as e:
        logger.warning("Supabase Auth sign_up failed (attempting admin creation): %s", e)
        try:
            admin_client = get_admin_client()
            admin_res = admin_client.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"name": name}
            })
            auth_user = admin_res.user
            try:
                login_res = client.auth.sign_in_with_password({"email": email, "password": password})
                session = login_res.session
            except Exception:
                session = None
        except Exception as admin_err:
            logger.error("Admin user creation failed: %s", admin_err)
            raise ValueError(f"Registration failed: {e}")

    if not auth_user:
        raise ValueError("Registration failed: no user returned from Supabase Auth.")

    # NOTE: Create a profile row in the public.users table
    try:
        user_profile = user_repository.create_user(
            user_id=auth_user.id,
            name=name,
            profile=f"https://i.pravatar.cc/150?u={auth_user.id}",
        )
    except Exception as err:
        logger.warning("Failed to save profile row for user %s: %s", auth_user.id, err)
        user_profile = {
            "id": auth_user.id,
            "name": name,
            "profile": f"https://i.pravatar.cc/150?u={auth_user.id}",
        }

    return {
        "access_token": session.access_token if session else None,
        "user": user_profile,
    }


def login(email: str, password: str) -> dict:
    """
    Login a user via Supabase Auth using email and password.
    @param email User email
    @param password User password
    @returns dict with access_token, user profile
    """
    client = get_supabase_client()
    try:
        auth_response = client.auth.sign_in_with_password(
            {"email": email, "password": password}
        )
    except Exception as e:
        logger.error("Supabase Auth login failed for %s: %s", email, e)
        raise ValueError("Login failed: Invalid email or password.")

    auth_user = auth_response.user
    if not auth_user:
        raise ValueError("Login failed: Invalid credentials.")

    # Retrieve the public profile for the authenticated user
    try:
        user_profile = user_repository.get_user_by_id(auth_user.id)
    except Exception as err:
        logger.warning("Failed to fetch profile for user %s: %s", auth_user.id, err)
        user_profile = None

    if not user_profile:
        # Auto-create profile if missing (edge case during dev)
        display_name = (auth_user.user_metadata.get("name") if auth_user.user_metadata else None) or email.split("@")[0]
        try:
            user_profile = user_repository.create_user(
                user_id=auth_user.id,
                name=display_name,
                profile=f"https://i.pravatar.cc/150?u={auth_user.id}",
            )
        except Exception as err:
            logger.warning("Failed to auto-create profile for user %s: %s", auth_user.id, err)
            user_profile = {
                "id": auth_user.id,
                "name": display_name,
                "profile": f"https://i.pravatar.cc/150?u={auth_user.id}",
            }

    session = auth_response.session
    return {
        "access_token": session.access_token if session else None,
        "user": user_profile,
    }


def get_current_user(access_token: str) -> dict | None:
    """
    Validate an access token and return the corresponding user profile.
    @param access_token JWT access token
    @returns user profile dict or None
    """
    client = get_supabase_client()
    try:
        auth_user = client.auth.get_user(access_token)
    except Exception as e:
        logger.warning("Token validation failed: %s", e)
        return None

    if not auth_user or not auth_user.user:
        return None

    profile = user_repository.get_user_by_id(auth_user.user.id)
    if profile:
        return profile

    # Authentication and profile persistence are separate concerns. Keep a
    # valid Auth identity usable for protected endpoints even if a profile
    # trigger/migration has not created the row yet.
    metadata = auth_user.user.user_metadata or {}
    return {
        "id": auth_user.user.id,
        "name": metadata.get("name") or "User",
        "display_name": metadata.get("display_name") or metadata.get("name") or "User",
        "username": metadata.get("username"),
        "profile": None,
        "bio": "",
    }


def get_authenticated_user_id(access_token: str) -> str | None:
    """Return the Supabase Auth user ID without requiring a profiles row."""
    client = get_supabase_client()
    try:
        auth_user = client.auth.get_user(access_token)
        return auth_user.user.id if auth_user and auth_user.user else None
    except Exception as e:
        logger.warning("Token validation failed: %s", e)
        return None
