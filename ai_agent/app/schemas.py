"""
Pydantic schemas for API request validation and response serialization.
"""

from pydantic import BaseModel, Field


# ── Response sub-models ──────────────────────────────────────────────

class VocabularyItem(BaseModel):
    """A vocabulary word with pronunciation and Chinese meaning."""

    word: str = Field(..., description="英文单词")
    phonetic: str = Field(..., description="音标")
    meaning: str = Field(..., description="中文释义")
    example_sentence: str = Field(..., description="绘本中的例句")
    example_translation: str = Field(..., description="例句的中文翻译")


class SentencePair(BaseModel):
    """A single sentence with English original and Chinese translation."""

    en: str = Field(..., description="英文原句")
    zh: str = Field(..., description="中文翻译")


class PageContent(BaseModel):
    """Content extracted from a single page of the picture book."""

    page: int = Field(..., description="页码（从 1 开始）")
    sentences: list[SentencePair] = Field(
        default_factory=list,
        description="该页所有句子的中英对照",
    )


class QuestionItem(BaseModel):
    """A comprehension question about the story."""

    question: str = Field(..., description="英文提问")
    hint: str = Field(..., description="回答提示")
    answer: str = Field(..., description="参考答案")


class StoryParseResult(BaseModel):
    """The complete parsed result of a picture book."""

    title: str = Field(..., description="绘本标题")
    theme: str = Field(..., description="主题概述（中文）")
    vocabulary: list[VocabularyItem] = Field(
        default_factory=list,
        description="生词表",
    )
    pages: list[PageContent] = Field(
        default_factory=list,
        description="逐页内容",
    )
    questions: list[QuestionItem] = Field(
        default_factory=list,
        description="阅读理解提问",
    )


# ── Default Prompt Template ──────────────────────────────────────────

DEFAULT_SYSTEM_PROMPT = """\
You are an English education expert specializing in analyzing English picture books \
for elementary school students.

Your target audience: Chinese elementary school students who can read \
RAZ (Reading A-Z) Level E books.

TASK:
Analyze the provided picture book page images and return a structured JSON object matching the requested schema.

RULES:
1. **title**: Extract the title of the picture book. If not visible, infer from content.
2. **theme**: Write a concise Chinese summary (2-3 sentences) describing what the story \
is about and its educational value.
3. **vocabulary**: Extract a comprehensive list of approximately 18-25 core practice vocabulary words (target ~20 words) from the story for typing and spelling practice. \
   - Prioritize key narrative words, verbs, adjectives, and nouns suitable for RAZ Level E learning. \
   - If the story has fewer than 20 rare words, include all meaningful action verbs, descriptive adjectives, and thematic nouns from the story sentences so the list reaches ~20 words. \
   - Ensure all extracted vocabulary words actually appear in the story text. \
   - For each word provide: \
     - "word": the English word (lowercase) \
     - "phonetic": IPA phonetic transcription (e.g. /luːn/) \
     - "meaning": clear and accurate Chinese translation \
     - "example_sentence": an original sentence from the story containing this word \
     - "example_translation": the Chinese translation of the example sentence
4. **pages**: For each image (in order), extract ONLY the core narrative/story text. \
DO NOT extract exercise questions, quizzes, captions, metadata, or activity questions (such as 'Activity 1', 'Questions:', or book reflection prompts) that are not part of the main story content. \
Split into individual sentences. For each sentence provide:
   - "en": the original English sentence exactly as written
   - "zh": natural, child-friendly Chinese translation
5. **questions**: Generate exactly {question_count} comprehension questions in English. \
Each question should:
   - Test understanding of the story (who, what, when, where, why, how)
   - Be appropriate for the target reading level
   - Include a "hint" (a clue to help the student find the answer)
   - Include an "answer" (a complete English sentence)

IMPORTANT:
- Page numbers start from 1 and correspond to the order of images provided.
- Keep translations natural and age-appropriate for children.
- If a page has no story text, still include it with an empty sentences array.
- Strictly ignore page numbers, header/footer titles, or post-reading activity questions when building the "pages" content.
"""


# ── Request sub-models ───────────────────────────────────────────────

class StoryParseRequest(BaseModel):
    """Optional request schema for story parsing parameters."""

    question_count: int = Field(default=5, ge=1, le=20, description="生成的阅读理解题目数量")
    model: str | None = Field(default=None, description="指定模型名称")
    cli: str = Field(default="agy", description="指定 Agent CLI 引擎 ('agy' 或 'codex')")
    custom_prompt: str | None = Field(default=None, description="自定义解析提示词")
    prompt: str | None = Field(default=None, description="自定义解析提示词别名")


# ── API response wrapper ─────────────────────────────────────────────

class APIResponse(BaseModel):
    """Standardized API response envelope."""

    success: bool = True
    data: StoryParseResult | None = None
    error: str | None = None
