from unittest.mock import AsyncMock
import io
import tempfile

import pytest
from PIL import Image
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from app import main as main_module
from app.schemas import DEFAULT_SYSTEM_PROMPT, StoryParseResult
from app.services.gemini_parser import SYSTEM_PROMPT


def _parse_result() -> StoryParseResult:
    return StoryParseResult(
        title="Prompt Test Story",
        theme="用于验证提示词透传。",
        vocabulary=[],
        pages=[],
        questions=[],
    )


@pytest.fixture
def parser_mock():
    parser = AsyncMock()
    parser.parse_images.return_value = _parse_result()
    return parser


def _valid_upload() -> UploadFile:
    image_buffer = io.BytesIO()
    Image.new("RGB", (8, 8), color="white").save(image_buffer, format="PNG")
    upload_file = tempfile.SpooledTemporaryFile()
    upload_file.write(image_buffer.getvalue())
    upload_file.seek(0)
    return UploadFile(
        file=upload_file,
        filename="page-1.png",
        headers=Headers({"content-type": "image/png"}),
    )


async def _post_parse(parser_mock, monkeypatch, data: dict[str, str]):
    monkeypatch.setattr(main_module, "parser", parser_mock)
    return await main_module.parse_story(
        images=[_valid_upload()],
        question_count=3,
        cli="agy",
        model=None,
        prompt=data.get("prompt"),
        custom_prompt=data.get("custom_prompt"),
    )


@pytest.mark.asyncio
async def test_custom_prompt_is_trimmed_and_forwarded_to_parser(parser_mock, monkeypatch):
    response = await _post_parse(
        parser_mock,
        monkeypatch,
        {
            "prompt": "prompt alias",
            "custom_prompt": "  Use a playful teaching style.  ",
        },
    )

    assert response.success is True
    parser_mock.parse_images.assert_awaited_once()
    kwargs = parser_mock.parse_images.await_args.kwargs
    assert kwargs["question_count"] == 3
    assert kwargs["cli"] == "agy"
    assert kwargs["custom_prompt"] == "Use a playful teaching style."


@pytest.mark.asyncio
async def test_prompt_alias_is_forwarded_when_custom_prompt_is_omitted(parser_mock, monkeypatch):
    response = await _post_parse(parser_mock, monkeypatch, {"prompt": "  Focus on animal vocabulary.  "})

    assert response.success is True
    kwargs = parser_mock.parse_images.await_args.kwargs
    assert kwargs["custom_prompt"] == "Focus on animal vocabulary."


@pytest.mark.parametrize(
    "data",
    [
        {},
        {"prompt": ""},
        {"prompt": "   \n\t  "},
        {"custom_prompt": ""},
        {"custom_prompt": "   \n\t  "},
    ],
)
@pytest.mark.asyncio
async def test_missing_or_blank_prompt_forwards_none_for_default_fallback(
    parser_mock, monkeypatch, data
):
    response = await _post_parse(parser_mock, monkeypatch, data)

    assert response.success is True
    kwargs = parser_mock.parse_images.await_args.kwargs
    assert kwargs["custom_prompt"] is None


def test_parser_default_prompt_uses_canonical_schema_template():
    assert SYSTEM_PROMPT == DEFAULT_SYSTEM_PROMPT
    assert "{question_count}" in SYSTEM_PROMPT
    assert "English education expert" in SYSTEM_PROMPT


@pytest.mark.asyncio
async def test_parse_rejects_invalid_image_content(parser_mock, monkeypatch):
    monkeypatch.setattr(main_module, "parser", parser_mock)
    upload_file = tempfile.SpooledTemporaryFile()
    upload_file.write(b"not-an-image")
    upload_file.seek(0)
    upload = UploadFile(
        file=upload_file,
        filename="fake.png",
        headers=Headers({"content-type": "image/png"}),
    )
    with pytest.raises(HTTPException) as exc:
        await main_module.parse_story(
            images=[upload], question_count=5, model=None, cli="agy", prompt=None, custom_prompt=None
        )
    assert exc.value.status_code == 400
    assert "有效图片" in str(exc.value.detail)


@pytest.mark.asyncio
async def test_models_rejects_unknown_cli():
    with pytest.raises(HTTPException) as exc:
        await main_module.list_models(cli="unknown")
    assert exc.value.status_code == 400
