import io
import json
import logging
import os
from minio import Minio

logger = logging.getLogger(__name__)

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio-prod:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ROOT_USER", "prod_minio_admin")
MINIO_SECRET_KEY = os.getenv("MINIO_ROOT_PASSWORD", "prod_minio_pass_CHANGE_ME")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "wordquest-stories")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"

_minio_client = None


def get_minio_client() -> Minio:
    """Initialize and cache MinIO client singleton."""
    global _minio_client
    if _minio_client is None:
        try:
            _minio_client = Minio(
                MINIO_ENDPOINT,
                access_key=MINIO_ACCESS_KEY,
                secret_key=MINIO_SECRET_KEY,
                secure=MINIO_SECURE,
            )
            ensure_bucket_exists()
        except Exception as e:
            logger.error("Failed to initialize MinIO client: %s", e)
            raise
    return _minio_client


def ensure_bucket_exists():
    """Ensure the target bucket exists and has a public read policy."""
    client = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=MINIO_SECURE,
    )
    try:
        if not client.bucket_exists(MINIO_BUCKET):
            client.make_bucket(MINIO_BUCKET)
            logger.info("Created MinIO bucket: %s", MINIO_BUCKET)

        # Set public read policy so illustrations can be read by browser and PWA
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{MINIO_BUCKET}/*"],
                }
            ],
        }
        client.set_bucket_policy(MINIO_BUCKET, json.dumps(policy))
        logger.info("MinIO bucket '%s' policy set to public read.", MINIO_BUCKET)
    except Exception as e:
        logger.warning("Failed setting bucket policy for '%s': %s", MINIO_BUCKET, e)


def upload_illustration_bytes(
    image_bytes: bytes, filename: str, content_type: str = "image/webp"
) -> str:
    """
    Upload image bytes to MinIO bucket and return the relative API path.
    The returned path is formatted as /api/illustrations/{filename}.
    """
    client = get_minio_client()
    data_stream = io.BytesIO(image_bytes)
    data_length = len(image_bytes)

    client.put_object(
        MINIO_BUCKET,
        filename,
        data_stream,
        length=data_length,
        content_type=content_type,
    )
    logger.info("Uploaded illustration to MinIO: %s/%s (%d bytes)", MINIO_BUCKET, filename, data_length)
    return f"/api/illustrations/{filename}"
