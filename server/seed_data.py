"""
Seed data script — populates Supabase with demo data matching
the original hardcoded mock data from the frontend.

Usage: python -m server.seed_data
"""

import os
import sys
import logging
from dotenv import load_dotenv

# Load env vars before importing Supabase client
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from server.supabase_client import get_supabase_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Demo Users ---
DEMO_USERS = [
    {"id": "00000000-0000-0000-0000-000000000001", "name": "sophia_brews", "profile": "https://i.pravatar.cc/150?u=sophia"},
    {"id": "00000000-0000-0000-0000-000000000002", "name": "sarah_c", "profile": "https://i.pravatar.cc/150?u=sarah"},
    {"id": "00000000-0000-0000-0000-000000000003", "name": "coffee.queen", "profile": "https://i.pravatar.cc/150?u=queen"},
    {"id": "00000000-0000-0000-0000-000000000004", "name": "ella_brew", "profile": "https://i.pravatar.cc/150?u=ella"},
    {"id": "00000000-0000-0000-0000-000000000005", "name": "design_latte", "profile": "https://i.pravatar.cc/150?u=design"},
]

# --- Demo Cafes ---
DEMO_CAFES = [
    {
        "name": "The Blanc Atelier",
        "rating": 4.9,
        "reviews": 1200,
        "price_level": "$$",
        "type": "Specialty Coffee",
        "address": "Chelsea, New York",
        "status": "Open until 7:00 PM",
        "tags": ["Natural Light", "Minimalist", "White Decor"],
        "hero_image": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800",
        "inspiration_images": [
            "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=400",
            "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=400",
            "https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&q=80&w=400",
            "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&q=80&w=400",
        ],
    },
    {
        "name": "Velvet & Vine",
        "rating": 4.7,
        "reviews": 856,
        "price_level": "$$$",
        "type": "Boutique Cafe",
        "address": "SoHo, New York",
        "status": "Open until 8:00 PM",
        "tags": ["Luxury", "Velvet", "Gold Accents"],
        "hero_image": "https://images.unsplash.com/photo-1525610553991-2bede1a236e2?auto=format&fit=crop&q=80&w=800",
        "inspiration_images": [],
    },
]

# --- Demo Posts (by different users) ---
DEMO_POSTS = [
    {
        "user_id": "00000000-0000-0000-0000-000000000002",
        "image_url": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800",
        "location": "Paris, France",
        "rating": 4.5,
        "caption": "The most serene morning at this little hidden gem. The oat milk latte was perfection and the light hitting the tables is just... ✨ #coffee #aesthetic #brewspot #morningvibe",
    },
    {
        "user_id": "00000000-0000-0000-0000-000000000003",
        "image_url": "https://images.unsplash.com/photo-1501339819358-ee5969a2f238?auto=format&fit=crop&q=80&w=800",
        "location": "New York, USA",
        "rating": 4.0,
        "caption": "Found the perfect study spot today! ☕️📚",
    },
    {
        "user_id": "00000000-0000-0000-0000-000000000004",
        "image_url": "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&q=80&w=800",
        "location": "London, UK",
        "rating": 5.0,
        "caption": "Minimalist vibes only. 🤍",
    },
    {
        "user_id": "00000000-0000-0000-0000-000000000005",
        "image_url": "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&q=80&w=800",
        "location": "Tokyo, Japan",
        "rating": 4.8,
        "caption": "Tokyo coffee scene is next level. 🇯🇵☕️",
    },
]

# --- User Posts (by sophia_brews) ---
USER_POSTS = [
    {"user_id": "00000000-0000-0000-0000-000000000001", "image_url": "https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&q=80&w=400", "caption": "Morning brew."},
    {"user_id": "00000000-0000-0000-0000-000000000001", "image_url": "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&q=80&w=400", "caption": "Cozy corners."},
    {"user_id": "00000000-0000-0000-0000-000000000001", "image_url": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=400", "caption": "Latte art."},
    {"user_id": "00000000-0000-0000-0000-000000000001", "image_url": "https://images.unsplash.com/photo-1512568400610-62da28bc8a13?auto=format&fit=crop&q=80&w=400", "caption": "Espresso shots."},
    {"user_id": "00000000-0000-0000-0000-000000000001", "image_url": "https://images.unsplash.com/photo-1497933321188-941f9ad36b12?auto=format&fit=crop&q=80&w=400", "caption": "Coffee and books."},
    {"user_id": "00000000-0000-0000-0000-000000000001", "image_url": "https://images.unsplash.com/photo-1506619216599-9d16d0903dfd?auto=format&fit=crop&q=80&w=400", "caption": "Roasting day."},
    {"user_id": "00000000-0000-0000-0000-000000000001", "image_url": "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&q=80&w=400", "caption": "Cafe exterior."},
    {"user_id": "00000000-0000-0000-0000-000000000001", "image_url": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=400", "caption": "Coffee beans."},
    {"user_id": "00000000-0000-0000-0000-000000000001", "image_url": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=400", "caption": "Pink tiles."},
]


def seed():
    """
    Insert all demo data into Supabase.
    Uses upsert to be idempotent — safe to run multiple times.
    """
    client = get_supabase_client()

    logger.info("Seeding users...")
    client.table("users").upsert(DEMO_USERS, on_conflict="id").execute()

    logger.info("Seeding cafes...")
    client.table("cafes").upsert(DEMO_CAFES, on_conflict="id").execute()

    logger.info("Seeding feed posts...")
    client.table("posts").upsert(DEMO_POSTS, on_conflict="id").execute()

    logger.info("Seeding user posts (sophia_brews)...")
    client.table("posts").upsert(USER_POSTS, on_conflict="id").execute()

    logger.info("✅ Seed data inserted successfully!")


if __name__ == "__main__":
    seed()
