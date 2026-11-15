from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_tts_voices():
    response = client.get("/tts/voices")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["voices"], list)
    assert len(data["voices"]) >= 5
    voice_ids = [v["id"] for v in data["voices"]]
    assert "en-US-ChristopherNeural" in voice_ids
    assert "en-US-AnaNeural" in voice_ids


def test_generate_tts_empty_text():
    response = client.post("/tts/generate", json={"text": "   ", "voice": "en-US-ChristopherNeural"})
    assert response.status_code == 400
    assert "Text cannot be empty" in response.json()["detail"]


@patch("edge_tts.Communicate")
def test_generate_tts_success(mock_communicate_cls):
    # Mock Communicate stream chunks
    mock_instance = AsyncMock()

    async def mock_stream():
        yield {"type": "audio", "data": b"FAKE_MP3_STREAM_DATA"}

    mock_instance.stream = mock_stream
    mock_communicate_cls.return_value = mock_instance

    response = client.post(
        "/tts/generate",
        json={"text": "The quick brown fox jumps over the lazy dog.", "voice": "en-US-ChristopherNeural"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mpeg"
    assert response.content == b"FAKE_MP3_STREAM_DATA"
