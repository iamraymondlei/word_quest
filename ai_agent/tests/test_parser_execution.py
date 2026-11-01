import asyncio
from unittest.mock import AsyncMock, patch
import pytest

from app.schemas import StoryParseResult, EnrichedWord
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


def test_clean_and_parse_json_with_array():
    sample_array_json = """
    Here is the requested vocabulary list:
    [
      {
        "word": "curious",
        "phonetic": "/ˈkjʊəriəs/",
        "translation": "好奇的",
        "fun_sentences": [{"en": "The curious cat opened the box.", "zh": "好奇的猫打开了盒子。"}],
        "antonyms": "indifferent",
        "synonyms": "inquisitive",
        "root_affixes": "cur- (care)",
        "etymology": "From Latin cura."
      },
      {
        "word": "brave",
        "phonetic": "/breɪv/",
        "translation": "勇敢的",
        "fun_sentences": [{"en": "The brave knight saved the village.", "zh": "勇敢的骑士拯救了村庄。"}],
        "antonyms": "cowardly",
        "synonyms": "courageous",
        "root_affixes": "brave",
        "etymology": "From Italian bravo."
      }
    ]
    Hope this helps!
    """
    result = _clean_and_parse_json(sample_array_json)
    assert isinstance(result, list)
    assert len(result) == 2
    assert result[0]["word"] == "curious"
    assert result[1]["word"] == "brave"


def test_clean_and_parse_json_with_words_dict():
    sample_dict_json = """
    ```json
    {
      "words": [
        {
          "word": "curious",
          "phonetic": "/ˈkjʊəriəs/",
          "translation": "好奇的",
          "fun_sentences": [{"en": "The curious cat opened the box.", "zh": "好奇的猫打开了盒子。"}],
          "antonyms": "indifferent",
          "synonyms": "inquisitive",
          "root_affixes": "cur- (care)",
          "etymology": "From Latin cura."
        }
      ]
    }
    ```
    """
    result = _clean_and_parse_json(sample_dict_json)
    assert isinstance(result, dict)
    assert "words" in result
    assert result["words"][0]["word"] == "curious"



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
            model="gemini-3.8-flash-high",
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
        assert "gemini-3.8-flash-high" in cmd_args
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
        assert "gpt-5.6-sol" in cmd_args


def test_enriched_word_bilingual_schema():
    raw = {
        "word": "strict",
        "phonetic": "/strɪkt/",
        "translation": "严格的",
        "fun_sentences": [{"en": "He is strict.", "zh": "他很严格。"}],
        "antonyms": "lenient",
        "synonyms": "stern",
        "root_affixes": {
            "en": "From Latin stringere (to draw tight)",
            "zh": "源自拉丁语 stringere（拉紧）"
        },
        "etymology": {
            "en": "Ancient ropes pulled tight.",
            "zh": "古代拉得很紧的绳子。"
        }
    }
    word = EnrichedWord.model_validate(raw)
    assert word.word == "strict"
    assert word.root_affixes.en == "From Latin stringere (to draw tight)"
    assert word.root_affixes.zh == "源自拉丁语 stringere（拉紧）"
    assert word.etymology.en == "Ancient ropes pulled tight."
    assert word.etymology.zh == "古代拉得很紧的绳子。"


@pytest.mark.asyncio
async def test_bilingualize_roots_and_etymology_exec():
    parser = GeminiParser()
    fake_proc = AsyncMock()
    fake_proc.returncode = 0
    fake_proc.communicate.return_value = (
        b'{"results": [{"id": 47, "root_affixes": {"en": "root_en", "zh": "root_zh"}, "etymology": {"en": "etym_en", "zh": "etym_zh"}}]}',
        b"",
    )

    with patch("shutil.which", return_value="/usr/local/bin/agy"), \
         patch("asyncio.create_subprocess_exec", new=AsyncMock(return_value=fake_proc)):
        results = await parser.bilingualize_roots_and_etymology(
            items=[{"id": 47, "word": "strict", "root_affixes": "Latin", "etymology": "Ropes"}],
            effective_model="gemini-3.8-flash-high",
            cli_type="agy"
        )
        assert len(results) == 1
        assert results[0].id == 47
        assert results[0].root_affixes.en == "root_en"
        assert results[0].root_affixes.zh == "root_zh"
        assert results[0].etymology.en == "etym_en"
        assert results[0].etymology.zh == "etym_zh"


@pytest.mark.asyncio
async def test_parse_story_raw_vocabulary_list():
    parser = GeminiParser()
    fake_proc = AsyncMock()
    fake_proc.returncode = 0
    fake_proc.communicate.return_value = (
        b'{"title": "Kangaroo Baby", "theme": "About animals", "vocabulary": ["pouch", "wallaby", "baby", "bilby"], "pages": [], "questions": []}',
        b"",
    )

    with patch("shutil.which", return_value="/usr/local/bin/agy"), \
         patch("asyncio.create_subprocess_exec", new=AsyncMock(return_value=fake_proc)):
        result = await parser.parse_images(
            images=[(b"fake_image_bytes", "image/png")],
            question_count=3,
            model="gemini-3.8-flash-high",
            cli="agy",
        )
        assert isinstance(result, StoryParseResult)
        assert result.title == "Kangaroo Baby"
        assert len(result.vocabulary) == 4
        assert [v.word for v in result.vocabulary] == ["pouch", "wallaby", "baby", "bilby"]


@pytest.mark.asyncio
async def test_generate_comprehension_questions_exec():
    parser = GeminiParser()
    fake_proc = AsyncMock()
    fake_proc.returncode = 0
    fake_proc.communicate.return_value = (
        b'{"questions": [{"question": "Where does the baby stay?", "hint": "Look at the pouch.", "answer": "The baby stays in the mother\'s pouch."}]}',
        b"",
    )

    with patch("shutil.which", return_value="/usr/local/bin/agy"), \
         patch("asyncio.create_subprocess_exec", new=AsyncMock(return_value=fake_proc)):
        questions = await parser.generate_comprehension_questions(
            story_title="Kangaroo Baby",
            story_text="A baby kangaroo lives in a pouch.",
            question_count=1,
            model="gemini-3.8-flash-high",
            cli="agy"
        )
        assert len(questions) == 1
        assert questions[0].question == "Where does the baby stay?"
        assert questions[0].hint == "Look at the pouch."
        assert "pouch" in questions[0].answer


@pytest.mark.asyncio
async def test_generate_story_from_vocab_exec():
    from app.schemas import GeneratedStoryData
    parser = GeminiParser()
    fake_proc = AsyncMock()
    fake_proc.returncode = 0
    fake_proc.communicate.return_value = (
        b"""{
          "title": "Barnaby's Cozy Room",
          "theme": "\xe6\x95\x85\xe4\xba\x8b\xe8\xae\xb2\xe8\xbf\xb0\xe4\xba\x86\xe5\xb0\x8f\xe7\x86\x8a\xe6\x94\xb6\xe6\x8b\xbe\xe6\x88\xbf\xe9\x97\xb4\xe7\x9a\x84\xe6\xb8\xa9\xe9\xa6\xa8\xe7\xbb\x8f\xe5\x8e\x86\xe3\x80\x82",
          "passage": "Barnaby sits on the red sofa. He looks at the table.",
          "target_words_covered": ["sofa", "table"],
          "pages": [
            {
              "page": 1,
              "illustration_prompt": "A cute bear sitting on a sofa",
              "sentences": [
                {"en": "Barnaby sits on the red sofa.", "zh": "\xe5\xb7\xb4\xe7\xba\xb3\xe6\xaf\x94\xe5\x9d\x90\xe5\x9c\xa8\xe7\xba\xa2\xe8\x89\xb2\xe7\x9a\x84\xe6\xb2\x99\xe5\x8f\x91\xe4\xb8\x8a\xe3\x80\x82"}
              ]
            },
            {
              "page": 2,
              "illustration_prompt": "A bear looking at a wooden table",
              "sentences": [
                {"en": "He looks at the table.", "zh": "\xe4\xbb\x96\xe7\x9c\x8b\xe7\x9d\x80\xe6\xa1\x8c\xe5\xad\x90\xe3\x80\x82"}
              ]
            }
          ],
          "questions": [
            {
              "question": "Where does Barnaby sit?",
              "hint": "Check the sofa.",
              "answer": "He sits on the red sofa."
            }
          ]
        }""",
        b"",
    )

    with patch("shutil.which", return_value="/usr/local/bin/agy"), \
         patch("asyncio.create_subprocess_exec", new=AsyncMock(return_value=fake_proc)):
        result = await parser.generate_story_from_vocab(
            words=["sofa", "table"],
            title="Barnaby's Cozy Room",
            category="House and Furniture",
            theme_style="animal_tale",
            target_level="RAZ C-E",
            page_count=2,
            question_count=1,
            cli="agy",
        )
        assert isinstance(result, GeneratedStoryData)
        assert result.title == "Barnaby's Cozy Room"
        assert len(result.pages) == 2
        assert len(result.questions) == 1
        assert "sofa" in result.target_words_covered
