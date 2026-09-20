import io
import unittest
from unittest.mock import MagicMock, patch
from PIL import Image

from app.services.image_cropper import crop_and_compress_illustration
from app.services.storage import get_minio_client, upload_illustration_bytes


def create_test_image(width=800, height=600, color=(100, 150, 200)) -> bytes:
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


class TestImageCropper(unittest.TestCase):
    def test_crop_normal_box(self):
        raw_bytes = create_test_image(800, 600)
        # ymin, xmin, ymax, xmax in 0-1000
        box = [100, 200, 700, 800]
        cropped_webp = crop_and_compress_illustration(raw_bytes, box)

        self.assertIsNotNone(cropped_webp)
        self.assertGreater(len(cropped_webp), 0)
        with Image.open(io.BytesIO(cropped_webp)) as img:
            self.assertEqual(img.format, "WEBP")
            self.assertGreater(img.width, 0)
            self.assertGreater(img.height, 0)

    def test_crop_out_of_bounds_clamping(self):
        raw_bytes = create_test_image(800, 600)
        # Box exceeding [0, 1000]
        box = [-100, -50, 1200, 1050]
        cropped_webp = crop_and_compress_illustration(raw_bytes, box)

        self.assertIsNotNone(cropped_webp)
        with Image.open(io.BytesIO(cropped_webp)) as img:
            self.assertEqual(img.format, "WEBP")
            self.assertLessEqual(img.width, 800)
            self.assertLessEqual(img.height, 600)

    def test_crop_invalid_or_degenerate_box(self):
        raw_bytes = create_test_image(800, 600)

        # ymin >= ymax
        self.assertIsNone(crop_and_compress_illustration(raw_bytes, [500, 100, 500, 400]))
        self.assertIsNone(crop_and_compress_illustration(raw_bytes, [600, 100, 500, 400]))

        # xmin >= xmax
        self.assertIsNone(crop_and_compress_illustration(raw_bytes, [100, 500, 400, 500]))

        # Invalid length / None
        self.assertIsNone(crop_and_compress_illustration(raw_bytes, [100, 200]))
        self.assertIsNone(crop_and_compress_illustration(raw_bytes, None))

    def test_minio_client_singleton_and_upload(self):
        fake_client = MagicMock()
        with patch("app.services.storage.get_minio_client", return_value=fake_client):
            raw_bytes = create_test_image(200, 200)
            url = upload_illustration_bytes(raw_bytes, "test_unit_run.webp", "image/webp")

        self.assertEqual(url, "/api/illustrations/test_unit_run.webp")
        fake_client.put_object.assert_called_once()


if __name__ == "__main__":
    unittest.main()
