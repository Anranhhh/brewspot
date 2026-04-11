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
    """
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables."
            )
        _client = create_client(url, key)
        logger.info("Supabase client initialized successfully.")
    return _client
