import io
import logging
from PIL import Image

logger = logging.getLogger(__name__)


def crop_and_compress_illustration(
    image_path_or_bytes: str | bytes,
    box: list[int] | None = None,
    allow_full_image: bool = False,
    max_dimension: int = 1600,
    quality: int = 82,
) -> bytes | None:
    """
    Crop illustration from page image using normalized coordinates [ymin, xmin, ymax, xmax] (0-1000).
    Converts and compresses to WebP format for fast transfer and offline caching.
    Returns None if box is absent, invalid, or area is too small (unless allow_full_image=True).
    """
    if not box and not allow_full_image:
        return None

    if isinstance(image_path_or_bytes, bytes):
        img = Image.open(io.BytesIO(image_path_or_bytes))
    else:
        img = Image.open(image_path_or_bytes)

    width, height = img.size

    if box and len(box) == 4:
        try:
            raw_ymin, raw_xmin, raw_ymax, raw_xmax = box
            ymin = max(0, min(1000, int(raw_ymin)))
            xmin = max(0, min(1000, int(raw_xmin)))
            ymax = max(0, min(1000, int(raw_ymax)))
            xmax = max(0, min(1000, int(raw_xmax)))

            if ymax <= ymin or xmax <= xmin:
                logger.warning("Degenerate bounding box %s", box)
                return None

            left = int((xmin / 1000.0) * width)
            top = int((ymin / 1000.0) * height)
            right = int((xmax / 1000.0) * width)
            bottom = int((ymax / 1000.0) * height)

            # Ensure minimum reasonable area
            if (right - left) < 30 or (bottom - top) < 30:
                logger.warning("Bounding box too small: %s", (left, top, right, bottom))
                return None

            img = img.crop((left, top, right, bottom))
            logger.info("Cropped illustration to (%d, %d, %d, %d)", left, top, right, bottom)
        except Exception as e:
            logger.warning("Failed cropping with box %s: %s", box, e)
            return None
    elif not allow_full_image:
        return None

    # Color mode conversion for WebP
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        img = img.convert("RGBA")
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Limit maximum dimension to save space and network bandwidth
    cur_w, cur_h = img.size
    if max(cur_w, cur_h) > max_dimension:
        scale = max_dimension / float(max(cur_w, cur_h))
        new_w = max(1, int(cur_w * scale))
        new_h = max(1, int(cur_h * scale))
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        logger.info("Resized illustration to %dx%d (scale %.2f)", new_w, new_h, scale)

    output = io.BytesIO()
    img.save(output, format="WEBP", quality=quality, method=4)
    result_bytes = output.getvalue()
    logger.info("Generated WebP illustration: %d bytes", len(result_bytes))
    return result_bytes
