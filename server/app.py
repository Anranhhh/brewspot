"""
Flask application factory.
Configures CORS, registers API blueprints, and loads environment variables.
"""

import os
import logging
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

# Load .env from the project root (one level up from server/)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def create_app() -> Flask:
    """
    Application factory — creates and configures the Flask app.
    """
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "dev-secret-key")

    # NOTE: Allow requests from the Vite dev server on port 3000
    CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

    # Register API blueprints
    from server.api.auth_api import auth_bp
    from server.api.cafe_api import cafe_bp
    from server.api.post_api import post_bp
    from server.api.user_api import user_bp
    from server.api.messages_api import messages_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(cafe_bp)
    app.register_blueprint(post_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(messages_bp)

    # Health check endpoint
    @app.route("/api/health")
    def health():
        return {"status": "ok"}, 200

    logger.info("BrewSpot API initialized with %d blueprints.", 4)
    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("FLASK_PORT", "5050"))
    app.run(host="0.0.0.0", port=port, debug=True)
