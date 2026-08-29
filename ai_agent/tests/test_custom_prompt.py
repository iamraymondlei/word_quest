from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

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
def parser_mock(monkeypatch):
    parser = AsyncMock()
    parser.parse_images.return_value = _parse_result()
    monkeypatch.setattr(main_module, "parser", parser)
    return parser


@pytest.fixture
def client(parser_mock):
    with TestClient(main_module.app) as test_client:
        yield test_client


def _post_parse(client: TestClient, data: dict[str, str]):
    return client.post(
        "/parse",
        data={
            "question_count": "3",
            "cli": "agy",
            **data,
        },
        files=[("images", ("page-1.png", b"fake-image-content", "image/png"))],
    )


def test_custom_prompt_is_trimmed_and_forwarded_to_parser(client, parser_mock):
    response = _post_parse(
        client,
        {
            "prompt": "prompt alias",
            "custom_prompt": "  Use a playful teaching style.  ",
        },
    )

    assert response.status_code == 200
    parser_mock.parse_images.assert_awaited_once()
    kwargs = parser_mock.parse_images.await_args.kwargs
    assert kwargs["question_count"] == 3
    assert kwargs["cli"] == "agy"
    assert kwargs["custom_prompt"] == "Use a playful teaching style."


def test_prompt_alias_is_forwarded_when_custom_prompt_is_omitted(client, parser_mock):
    response = _post_parse(client, {"prompt": "  Focus on animal vocabulary.  "})

    assert response.status_code == 200
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
def test_missing_or_blank_prompt_forwards_none_for_default_fallback(
    client, parser_mock, data
):
    response = _post_parse(client, data)

    assert response.status_code == 200
    kwargs = parser_mock.parse_images.await_args.kwargs
    assert kwargs["custom_prompt"] is None


def test_parser_default_prompt_uses_canonical_schema_template():
    assert SYSTEM_PROMPT == DEFAULT_SYSTEM_PROMPT
    assert "{question_count}" in SYSTEM_PROMPT
    assert "English education expert" in SYSTEM_PROMPT
