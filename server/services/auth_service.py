"""
Auth service — business logic for signup and login using Supabase Auth.
"""

import logging
from server.supabase_client import get_supabase_client
from server.repositories import user_repository

logger = logging.getLogger(__name__)


def register(email: str, password: str, name: str) -> dict:
    """
    Register a new user via Supabase Auth, then create a profile row.
    @param email User email
    @param password User password (min 6 chars)
    @param name Display name
    @returns dict with access_token, user profile
    """
    client = get_supabase_client()
    try:
        auth_response = client.auth.sign_up(
            {"email": email, "password": password}
        )
    except Exception as e:
        logger.error("Supabase Auth sign_up failed: %s", e)
        raise ValueError(f"Registration failed: {e}")

    auth_user = auth_response.user
    if not auth_user:
        raise ValueError("Registration failed: no user returned from Supabase Auth.")

    # NOTE: Create a profile row in the public.users table
    user_profile = user_repository.create_user(
        user_id=auth_user.id,
        name=name,
        profile=f"https://i.pravatar.cc/150?u={auth_user.id}",
    )

    session = auth_response.session
    return {
        "access_token": session.access_token if session else None,
        "user": user_profile,
    }


def login(email: str, password: str) -> dict:
    """
    Login a user via Supabase Auth.
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
        logger.error("Supabase Auth login failed: %s", e)
        raise ValueError(f"Login failed: {e}")

    auth_user = auth_response.user
    if not auth_user:
        raise ValueError("Login failed: invalid credentials.")

    # Retrieve the public profile for the authenticated user
    user_profile = user_repository.get_user_by_id(auth_user.id)
    if not user_profile:
        # HACK: Auto-create profile if missing (edge case during dev)
        user_profile = user_repository.create_user(
            user_id=auth_user.id,
            name=email.split("@")[0],
            profile=f"https://i.pravatar.cc/150?u={auth_user.id}",
        )

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

    return user_repository.get_user_by_id(auth_user.user.id)
