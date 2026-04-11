import os
import logging
from dotenv import load_dotenv

# Load env variables before importing anything else
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from server.supabase_client import get_supabase_client
from server.repositories import user_repository

logging.basicConfig(level=logging.INFO)

# Standard password for all test accounts so you never forget!
TEST_PASSWORD = "password123!"

TEST_USERS = [
    {"email": "alice@brewspot.app", "name": "Alice Coffee"},
    {"email": "bob@brewspot.app", "name": "Bob Barista"},
    {"email": "charlie@brewspot.app", "name": "Charlie Latte"},
]

def seed_users():
    client = get_supabase_client()
    for u in TEST_USERS:
        email = u["email"]
        name = u["name"]
        
        logging.info(f"Registering test user: {email} | Password: {TEST_PASSWORD}")
        try:
            # 1. Create in Supabase Auth
            auth_response = client.auth.sign_up({
                "email": email, 
                "password": TEST_PASSWORD
            })
            
            auth_user = auth_response.user
            if not auth_user:
                logging.error(f"Failed to create Auth for {email}")
                continue
                
            # 2. Create in public Profile
            user_repository.create_user(
                user_id=auth_user.id,
                name=name,
                profile=f"https://i.pravatar.cc/150?u={auth_user.id}"
            )
            logging.info(f"Successfully seeded: {email}")
            
        except Exception as e:
            logging.warning(f"Skipped {email} (might already exist): {e}")

if __name__ == "__main__":
    seed_users()
