"""
Application configuration.

Loads settings from environment variables with sensible defaults.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    # Model Configuration
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.7-flash-high")
    MODELS_CONFIG_PATH: str = os.getenv(
        "MODELS_CONFIG_PATH",
        os.path.join(os.path.dirname(__file__), "models_config.json")
    )

    # App limits
    MAX_IMAGES: int = int(os.getenv("MAX_IMAGES", "10"))
    DEFAULT_QUESTION_COUNT: int = int(os.getenv("DEFAULT_QUESTION_COUNT", "5"))

    # Allowed image MIME types
    ALLOWED_IMAGE_TYPES: list[str] = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ]


settings = Settings()
