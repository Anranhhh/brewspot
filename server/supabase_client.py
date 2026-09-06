"""
Supabase client singleton.
Reads SUPABASE_URL and SUPABASE_SERVICE_KEY from environment variables
and exposes a single shared client instance for all repository layers.
"""

import os
import logging
from supabase import create_client, Client

logger = logging.getLogger(__name__)

_client: Client | None = None


def get_supabase_client() -> Client:
    """
    Return the shared Supabase client, creating it on first call.
    Ensures PostgREST always uses the service_role key to prevent RLS overrides.
    """
    global _client
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables."
        )
    if _client is None:
        _client = create_client(url, key)
        logger.info("Supabase client initialized successfully.")

    # Re-assert service_role authorization header on postgrest client
    # to avoid user auth sessions mutating backend database privileges
    _client.postgrest.auth(key)
    return _client


def get_admin_client() -> Client:
    """
    Return a fresh client instance using SUPABASE_SERVICE_KEY for admin operations
    such as auth admin lookup.
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables."
        )
    return create_client(url, key)
