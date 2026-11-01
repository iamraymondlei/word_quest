"""
Pydantic schemas for API request validation and response serialization.
"""

from typing import Any
from pydantic import BaseModel, Field, field_validator


# ── Response sub-models ──────────────────────────────────────────────

class VocabularyItem(BaseModel):
    """A vocabulary word with pronunciation and Chinese meaning."""

    word: str = Field(..., description="英文单词")
    phonetic: str = Field("", description="音标")
    meaning: str = Field("", description="中文释义")
    example_sentence: str = Field("", description="绘本中的例句")
    example_translation: str = Field("", description="例句的中文翻译")


class SentencePair(BaseModel):
    """A single sentence with English original and Chinese translation."""

    en: str = Field(..., description="英文原句")
    zh: str = Field(..., description="中文翻译")


class BilingualText(BaseModel):
    """Bilingual text container for roots and etymology."""

    en: str = ""
    zh: str = ""


class SongWordTranslation(BaseModel):
    word: str
    meaning: str
    phonetic: str = ""
    example: str = ""


class SongTranslationRequest(BaseModel):
    sentences: list[str] = Field(..., min_length=1, max_length=100)
    words: list[str] = Field(default_factory=list, max_length=60)
    model: str | None = None
    cli: str = "agy"


class SongTranslationResult(BaseModel):
    sentences: list[SentencePair]
    words: list[SongWordTranslation]


class TranslationResponse(BaseModel):
    success: bool = True
    data: SongTranslationResult | None = None
    error: str | None = None


class EnrichedWord(BaseModel):
    word: str
    phonetic: str = ""
    translation: str = ""
    fun_sentences: list[SentencePair] = Field(default_factory=list)
    antonyms: str = ""
    synonyms: str = ""
    root_affixes: BilingualText | str = Field(default_factory=BilingualText)
    etymology: BilingualText | str = Field(default_factory=BilingualText)

    @field_validator("root_affixes", "etymology", mode="before")
    @classmethod
    def coerce_bilingual(cls, v: Any) -> BilingualText | str:
        if isinstance(v, dict):
            return BilingualText(en=str(v.get("en", "")).strip(), zh=str(v.get("zh", "")).strip())
        return v


class VocabularyEnrichRequest(BaseModel):
    words: list[str] = Field(..., min_length=1, max_length=50)
    model: str | None = None
    cli: str = "agy"


class VocabularyEnrichResponse(BaseModel):
    success: bool = True
    data: list[EnrichedWord] = Field(default_factory=list)
    error: str | None = None


class WordBilingualizeItem(BaseModel):
    id: int
    word: str
    root_affixes: str = ""
    etymology: str = ""


class BilingualizeBatchRequest(BaseModel):
    items: list[WordBilingualizeItem] = Field(..., min_length=1, max_length=50)
    model: str | None = None
    cli: str = "agy"


class WordBilingualResult(BaseModel):
    id: int
    root_affixes: BilingualText
    etymology: BilingualText


class BilingualizeBatchResponse(BaseModel):
    success: bool = True
    data: list[WordBilingualResult] = Field(default_factory=list)
    error: str | None = None


class PageContent(BaseModel):
    """Content extracted from a single page of the picture book."""

    page: int = Field(..., description="页码（从 1 开始）")
    illustration_box: list[int] | None = Field(
        default=None,
        description="插画归一化边界框 [ymin, xmin, ymax, xmax]（取值 0-1000）",
    )
    illustration_url: str | None = Field(
        default=None,
        description="提取并裁剪后的插图持久化访问 URL",
    )
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

Your target audience: Chinese elementary school students who are reading \
RAZ (Reading A-Z) Level B–E books.

TASK:
Analyze the provided picture book page images and return a structured JSON object matching the requested schema.

RULES:
1. **title**: Extract the title of the picture book. If not visible, infer from content.
2. **theme**: Write a concise Chinese summary (2-3 sentences) describing what the story \
is about and its educational value.
3. **vocabulary**: Extract a list of core practice vocabulary words (target ~18-25 words) from the story for typing and spelling practice (e.g. key nouns, verbs, adjectives). \
   - Ensure all extracted vocabulary words actually appear in the story text. \
   - Output ONLY the list of lowercase English words (e.g. ["pouch", "wallaby", "baby", "bilby"]). \
   - Do NOT provide definitions, phonetics, translations, or example sentences during book import (these will be enriched later in the vocabulary editor).
4. **pages**: For each image (in order):
   - "illustration_box": Locate the main story illustration or photograph on this page and output its bounding box as [ymin, xmin, ymax, xmax] normalized integers from 0 to 1000. Exclude standalone text blocks, page numbers, and margins. If the page is text-only without any story picture, set to null.
   - "sentences": Extract ONLY the core narrative/story text. \
DO NOT extract exercise questions, quizzes, captions, metadata, or activity questions (such as 'Activity 1', 'Questions:', or book reflection prompts) that are not part of the main story content. \
Split into individual sentences. For each sentence provide:
     - "en": the original English sentence exactly as written
     - "zh": a faithful, word-for-word / phrase-for-phrase aligned Chinese translation designed for "Read Chinese & Speak English" (看中文说英文) recall practice:
       - **Every English word or phrase MUST have a clear corresponding Chinese meaning in the translation.** Do NOT omit, merge, or paraphrase away any words.
       - Explicitly translate all pronouns (he/she/it/they/my/our/this/that), articles/quantifiers when meaningful (a/one, some, many, every), adjectives (e.g. little, big, good), adverbs (e.g. too, very, now, again, up, down, away), prepositions (e.g. in, on, into, with, for), and modal/auxiliary nuances (e.g. can, will, want to, have to).
       - Avoid free/idiomatic translations that drop English words or add extra concepts not in the original sentence, so the student can reliably reconstruct every single English word just by looking at the Chinese sentence.
IMPORTANT:
- Page numbers start from 1 and correspond to the order of images provided.
- Keep sentence translations faithful and complete: prioritize 1-to-1 word/phrase cueing over literary paraphrasing, while keeping the Chinese understandable for children.
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


class GenerateQuestionsRequest(BaseModel):
    """Request schema for generating comprehension questions for a story."""

    story_title: str = Field(..., description="绘本标题")
    story_text: str = Field(..., description="绘本正文全文")
    question_count: int = Field(default=5, ge=1, le=15, description="生成的阅读理解题目数量")
    model: str | None = Field(default=None, description="指定模型名称")
    cli: str = Field(default="agy", description="指定 Agent CLI 引擎 ('agy' 或 'codex')")


class GenerateQuestionsResponse(BaseModel):
    """Response schema for generated comprehension questions."""

    success: bool
    data: list[QuestionItem] = Field(default_factory=list)
    error: str | None = None


class StoryPageItem(BaseModel):
    """A single page of a generated picture book story."""

    page: int = Field(..., description="页码（从 1 开始）")
    illustration_prompt: str = Field("", description="用于生成绘本插图的英文提示词")
    sentences: list[SentencePair] = Field(default_factory=list, description="该页句子列表")


class GeneratedStoryData(BaseModel):
    """Structured data of an AI-synthesized picture book story."""

    title: str = Field(..., description="绘本标题")
    theme: str = Field(..., description="主题与教育价值概述（中文）")
    passage: str = Field(..., description="完整故事英文正文")
    pages: list[StoryPageItem] = Field(default_factory=list, description="逐页结构")
    questions: list[QuestionItem] = Field(default_factory=list, description="阅读理解提问")
    target_words_covered: list[str] = Field(default_factory=list, description="故事中成功融入的目标生词")


class GenerateStoryFromVocabRequest(BaseModel):
    """Request schema for synthesizing a complete story from target vocabulary words."""

    words: list[str] = Field(..., min_length=1, max_length=60, description="目标核心生词列表")
    title: str | None = Field(default=None, description="期望绘本标题或关卡名称（可选）")
    category: str | None = Field(default="General", description="关卡分类")
    theme_style: str | None = Field(default="animal_tale", description="故事风格：animal_tale, daily_life, adventure, detective, humor")
    target_level: str | None = Field(default="RAZ C-E", description="目标阅读难度")
    page_count: int = Field(default=4, ge=2, le=10, description="生成页数（2-10页）")
    question_count: int = Field(default=4, ge=1, le=10, description="阅读理解题目数量")
    model: str | None = Field(default=None, description="指定模型名称")
    cli: str = Field(default="agy", description="指定 Agent CLI 引擎 ('agy' 或 'codex')")


class GenerateStoryFromVocabResponse(BaseModel):
    """Response envelope for AI-generated picture book story."""

    success: bool = True
    data: GeneratedStoryData | None = None
    error: str | None = None


# ── API response wrapper ─────────────────────────────────────────────

class APIResponse(BaseModel):
    """Standardized API response envelope."""

    success: bool = True
    data: StoryParseResult | None = None
    error: str | None = None
