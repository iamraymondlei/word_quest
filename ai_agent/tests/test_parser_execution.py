import asyncio
from unittest.mock import AsyncMock, patch
import pytest

from app.schemas import StoryParseResult
from app.services.gemini_parser import GeminiParser, _clean_and_parse_json


def test_clean_and_parse_json_with_little_loon_data():
    sample_json = """
    ```json
    {
      "title": "Little Loon",
      "theme": "故事讲述了小潜鸟分别同爸爸、妈妈一起在湖中游泳的温馨经历。",
      "vocabulary": [
        {
          "word": "loon",
          "phonetic": "/luːn/",
          "meaning": "潜鸟",
          "example_sentence": "Little Loon went swimming with Papa.",
          "example_translation": "小潜鸟和爸爸一起去游泳。"
        }
      ],
      "pages": [
        {"page": 1, "sentences": []},
        {
          "page": 2,
          "sentences": [
            {"en": "Little Loon went swimming with Papa.", "zh": "小潜鸟和爸爸一起去游泳。"}
          ]
        }
      ],
      "questions": [
        {
          "question": "Who did Little Loon go swimming with first?",
          "hint": "Check page 2.",
          "answer": "Little Loon went swimming with Papa first."
        }
      ]
    }
    ```
    """
    result = _clean_and_parse_json(sample_json)
    assert result["title"] == "Little Loon"
    assert len(result["vocabulary"]) == 1
    assert result["vocabulary"][0]["word"] == "loon"
    assert len(result["pages"]) == 2
    assert len(result["questions"]) == 1


@pytest.mark.asyncio
async def test_parse_images_builds_correct_agy_command():
    parser = GeminiParser()
    fake_proc = AsyncMock()
    fake_proc.returncode = 0
    fake_proc.communicate.return_value = (
        b'{"title": "Test Book", "theme": "Test", "vocabulary": [], "pages": [], "questions": []}',
        b"",
    )

    with patch("shutil.which", return_value="/usr/local/bin/agy"), \
         patch("asyncio.create_subprocess_exec", new=AsyncMock(return_value=fake_proc)) as mock_exec:
        
        result = await parser.parse_images(
            images=[(b"fake_image_bytes", "image/png")],
            question_count=3,
            model="gemini-3.7-flash-high",
            cli="agy",
        )

        assert isinstance(result, StoryParseResult)
        assert result.title == "Test Book"
        mock_exec.assert_awaited_once()
        cmd_args = mock_exec.await_args[0]
        assert "agy" in cmd_args[0]
        assert "--dangerously-skip-permissions" in cmd_args
        assert "--disable-slash-commands" in cmd_args
        assert "--model" in cmd_args
        assert "gemini-3.7-flash-high" in cmd_args
        assert "--add-dir" in cmd_args
        assert "-p" in cmd_args


@pytest.mark.asyncio
async def test_parse_images_builds_correct_codex_command():
    parser = GeminiParser()
    fake_proc = AsyncMock()
    fake_proc.returncode = 0
    fake_proc.communicate.return_value = (
        b'{"title": "Codex Book", "theme": "Test", "vocabulary": [], "pages": [], "questions": []}',
        b"",
    )

    with patch("shutil.which", return_value="/usr/local/bin/codex"), \
         patch("asyncio.create_subprocess_exec", new=AsyncMock(return_value=fake_proc)) as mock_exec:
        
        result = await parser.parse_images(
            images=[(b"fake_image_bytes", "image/png")],
            question_count=3,
            model="gpt-5.6-sol",
            cli="codex",
        )

        assert isinstance(result, StoryParseResult)
        assert result.title == "Codex Book"
        mock_exec.assert_awaited_once()
        cmd_args = mock_exec.await_args[0]
        assert "codex" in cmd_args[0]
        assert "exec" in cmd_args
        assert "--dangerously-bypass-approvals-and-sandbox" in cmd_args
        assert "--ephemeral" in cmd_args
        assert "-m" in cmd_args
        assert "gpt-5.6-sol" in cmd_args
