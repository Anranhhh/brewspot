import os
import logging
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
from server.supabase_client import get_supabase_client

logging.basicConfig(level=logging.INFO)

MOCK_CAFES = [
    {
        "name": "The Blanc Atelier",
        "distance": "0.8 miles away",
        "rating": 4.9,
        "image": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80",
        "author": "Sophia Miller",
        "author_avatar": "bg-pink-100",
        "tags": ["Minimalist", "Matcha", "Study Server"],
        "description": "A pristine white-themed cafe perfect for focused reading minimal distractions. Known for their ceremonial grade matcha and delicate pastries."
    },
    {
        "name": "Velvet & Vine",
        "distance": "1.2 miles away",
        "rating": 4.8,
        "image": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80",
        "author": "Marcus Thorne",
        "author_avatar": "bg-amber-100",
        "tags": ["Vintage", "Pour Over", "Evening"],
        "description": "Cozy dimly lit space with vintage velvet seating and extensive pour-over options. Perfect for evening dates or late-night conversations."
    },
    {
        "name": "Lumina Roasters",
        "distance": "2.5 miles away",
        "rating": 4.7,
        "image": "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80",
        "author": "Elena Rose",
        "author_avatar": "bg-blue-100",
        "tags": ["Industrial", "Espresso", "Bakery"],
        "description": "Industrial chic roastery with in-house bakery. The aroma of freshly roasted beans hits you the moment you walk in. Excellent espresso flights."
    }
]

def seed_content():
    client = get_supabase_client()

    # Get an existing user to mark as author for posts
    user_resp = client.table("users").select("id, name").limit(1).execute()
    if not user_resp.data:
        logging.error("No users found in database! Please run seed_users.py first.")
        return
    
    author_id = user_resp.data[0]["id"]
    
    # 1. Seed Cafes
    logging.info("Seeding Cafes...")
    cafe_ids = []
    for cafe in MOCK_CAFES:
        payload = {
            "name": cafe["name"],
            "address": cafe["distance"],
            "rating": cafe["rating"],
            "hero_image": cafe["image"],
            "tags": cafe["tags"]
        }
        res = client.table("cafes").insert(payload).execute()
        if res.data:
            cafe_ids.append(res.data[0]["id"])
            logging.info(f"Created Cafe: {cafe['name']}")
            
    # 2. Seed Posts
    if not cafe_ids:
        logging.error("No cafes were created to attach posts to.")
        return
        
    MOCK_POSTS = [
        {
            "cafe_id": cafe_ids[0],
            "caption": "Found the perfect corner for my design work today. The matcha here is genuinely top-tier! 🍵✨",
            "image": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80"
        },
        {
            "cafe_id": cafe_ids[1],
            "caption": "Late evening coffee run. This place feels like a classic novel come to life. ☕️📚",
            "image": "https://images.unsplash.com/photo-1445116572660-236099ae40d5?auto=format&fit=crop&q=80"
        }
    ]
    
    logging.info("Seeding Posts...")
    for post in MOCK_POSTS:
        payload = {
            "user_id": author_id,
            "image_url": post["image"],
            "caption": post["caption"]
        }
        res = client.table("posts").insert(payload).execute()
        if res.data:
            logging.info(f"Created Post for Cafe ID: {post['cafe_id']}")
            
            
if __name__ == "__main__":
    seed_content()
