import asyncio
import json
import logging
import os
import re
import shutil
import tempfile
import time

from app.config import settings
from app.schemas import DEFAULT_SYSTEM_PROMPT, StoryParseResult

logger = logging.getLogger(__name__)

# Fallback presets in case config file cannot be loaded
DEFAULT_AGY_MODELS = [
    {"id": "gemini-3.7-flash-high", "name": "Gemini 3.7 Flash (High)", "description": "High capability multimodal, recommended (Default)"},
    {"id": "gemini-3.7-flash-medium", "name": "Gemini 3.7 Flash (Medium)", "description": "Medium reasoning effort"},
    {"id": "gemini-3.7-flash-low", "name": "Gemini 3.7 Flash (Low)", "description": "Fastest low reasoning"},
    {"id": "gemini-3.6-flash-high", "name": "Gemini 3.6 Flash (High)", "description": "High performance multimodal"},
    {"id": "gemini-3.6-flash-medium", "name": "Gemini 3.6 Flash (Medium)", "description": "Balanced performance"},
    {"id": "gemini-3.6-flash-low", "name": "Gemini 3.6 Flash (Low)", "description": "Lightweight multimodal"},
    {"id": "gemini-3.5-flash-high", "name": "Gemini 3.5 Flash (High)", "description": "Standard fast multimodal"},
    {"id": "gemini-3.1-pro-high", "name": "Gemini 3.1 Pro (High)", "description": "Strongest reasoning capability"},
]

DEFAULT_CODEX_MODELS = [
    {"id": "gpt-5.6-sol", "name": "GPT-5.6 Sol", "description": "Codex Flagship multimodal model (Default)"},
    {"id": "gpt-4o", "name": "GPT-4o", "description": "OpenAI Flagship multimodal model"},
]

LEGACY_AGY_MODEL_MAP = {
    "gemini-2.5-flash": "gemini-3.7-flash-high",
    "gemini-2.0-flash-lite": "gemini-3.7-flash-low",
    "gemini-2.0-flash": "gemini-3.7-flash-medium",
    "gemini-1.5-flash": "gemini-3.5-flash-high",
    "gemini-2.5-pro": "gemini-3.1-pro-high",
    "gemini-3.7-flash": "gemini-3.7-flash-high",
    "gemini-3.6-flash": "gemini-3.6-flash-high",
    "gemini-3.5-flash": "gemini-3.5-flash-high",
    "gemini-3.1-pro": "gemini-3.1-pro-high",
}

_models_config_cache = {"mtime": 0.0, "data": {}}


def load_models_config() -> dict:
    """Load CLI models configuration from JSON file with hot-reload support."""
    config_path = getattr(settings, "MODELS_CONFIG_PATH", None)
    if not config_path or not os.path.exists(config_path):
        return {
            "agy": {
                "default_model": "gemini-3.7-flash-high",
                "models": DEFAULT_AGY_MODELS,
            },
            "codex": {
                "default_model": "gpt-5.6-sol",
                "models": DEFAULT_CODEX_MODELS,
            },
        }

    try:
        current_mtime = os.path.getmtime(config_path)
        if _models_config_cache["data"] and _models_config_cache["mtime"] == current_mtime:
            return _models_config_cache["data"]

        with open(config_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            _models_config_cache["data"] = data
            _models_config_cache["mtime"] = current_mtime
            logger.info("Loaded models configuration from %s", config_path)
            return data
    except Exception as e:
        logger.error("Failed to read models config file (%s): %s", config_path, e)
        return {
            "agy": {
                "default_model": "gemini-3.7-flash-high",
                "models": DEFAULT_AGY_MODELS,
            },
            "codex": {
                "default_model": "gpt-5.6-sol",
                "models": DEFAULT_CODEX_MODELS,
            },
        }


def get_cli_config(cli: str = "agy") -> dict:
    """Get CLI model configuration (default_model and models list) from config file."""
    cli_type = (cli or "agy").lower().strip()
    config = load_models_config()
    if cli_type in config:
        return config[cli_type]
    return {
        "default_model": "gemini-3.7-flash-high" if cli_type == "agy" else "gpt-5.6-sol",
        "models": DEFAULT_AGY_MODELS if cli_type == "agy" else DEFAULT_CODEX_MODELS,
    }


def normalize_codex_model(model_name: str | None) -> str:
    """Normalize model identifier for Codex CLI according to config file."""
    cli_cfg = get_cli_config("codex")
    default_m = cli_cfg.get("default_model", "gpt-5.6-sol")
    valid_ids = {m["id"] for m in cli_cfg.get("models", [])}

    if not model_name or not model_name.strip():
        return default_m
    clean_name = model_name.strip()
    if clean_name in valid_ids:
        return clean_name
    return default_m


def normalize_agy_model(model_name: str | None) -> str:
    """Normalize model identifier for agy CLI according to config file."""
    cli_cfg = get_cli_config("agy")
    default_m = cli_cfg.get("default_model", "gemini-3.7-flash-high")
    valid_ids = {m["id"] for m in cli_cfg.get("models", [])}

    if not model_name or not model_name.strip():
        return default_m
    clean_name = model_name.strip()
    if clean_name in valid_ids:
        return clean_name
    if clean_name in LEGACY_AGY_MODEL_MAP:
        mapped = LEGACY_AGY_MODEL_MAP[clean_name]
        return mapped if mapped in valid_ids else default_m
    return default_m


async def get_available_models(cli: str = "agy") -> list[dict]:
    """Fetch available models list for the given CLI tool from configuration."""
    return get_cli_config(cli).get("models", [])


def _clean_and_parse_json(out_text: str) -> dict:
    """Extract, clean, auto-repair, and parse JSON string from LLM / agy / codex CLI output."""
    if not out_text:
        raise ValueError("Empty output text from CLI response.")

    text = out_text.strip()

    # 1. Handle markdown code fences if wrapped in ```json ... ``` or ``` ... ```
    if "```" in text:
        blocks = text.split("```")
        for b in blocks:
            b_clean = b.strip()
            if b_clean.startswith("json"):
                b_clean = b_clean[4:].strip()
            if "{" in b_clean and "}" in b_clean:
                text = b_clean
                break

    # 2. Extract substring from first '{' to last '}'
    start_idx = text.find("{")
    end_idx = text.rfind("}")
    if start_idx == -1 or end_idx == -1:
        raise ValueError(f"Could not find valid JSON object boundaries in response text: {out_text[:200]}")

    json_str = text[start_idx:end_idx + 1]

    # Attempt 1: Direct standard JSON loads
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as err:
        logger.warning("Direct json.loads failed at pos %s (%s). Attempting auto-repair...", err.pos, err.msg)

    # Attempt 2: Auto-fix trailing commas before } or ]
    reconfigured = re.sub(r',\s*([}\]])', r'\1', json_str)
    try:
        return json.loads(reconfigured)
    except json.JSONDecodeError:
        pass

    # Attempt 3: Fix unescaped control characters (newlines, tabs in strings)
    reconfigured_ctrl = re.sub(r'[\r\n\t]', ' ', reconfigured)
    try:
        return json.loads(reconfigured_ctrl)
    except json.JSONDecodeError:
        pass

    # Attempt 4: Fix unescaped internal double quotes inside key-value strings
    pattern = r'("\w+"\s*:\s*")(.*?)(?="\s*[,}\n\]])'
    def _fix_unescaped_quotes(m):
        key_part = m.group(1)
        val_content = m.group(2)
        fixed_val = val_content.replace('"', "'")
        return f'{key_part}{fixed_val}'

    reconfigured_quotes = re.sub(pattern, _fix_unescaped_quotes, reconfigured_ctrl, flags=re.DOTALL)
    try:
        return json.loads(reconfigured_quotes)
    except json.JSONDecodeError:
        pass

    # Attempt 5: Fallback regex extraction of en/zh sentence pairs if whole JSON is malformed
    logger.warning("JSON structure malformed. Attempting fallback regex extraction...")
    fallback_data = {
        "title": "Picture Book Story",
        "theme": "英文绘本故事阅读",
        "vocabulary": [],
        "pages": [],
        "questions": []
    }

    title_match = re.search(r'"title"\s*:\s*"([^"]+)"', json_str)
    if title_match:
        fallback_data["title"] = title_match.group(1)

    theme_match = re.search(r'"theme"\s*:\s*"([^"]+)"', json_str)
    if theme_match:
        fallback_data["theme"] = theme_match.group(1)

    sentence_pairs = re.findall(r'\{\s*"en"\s*:\s*"([^"]+)"\s*,\s*"zh"\s*:\s*"([^"]+)"\s*\}', json_str)
    if sentence_pairs:
        page_sentences = [{"en": en, "zh": zh} for en, zh in sentence_pairs]
        fallback_data["pages"] = [{"page": 1, "sentences": page_sentences}]
        return fallback_data

    raise ValueError(f"JSON 格式解析失败 (Expecting ',' or syntax error). Raw snippet: {json_str[:300]}")


# ── Prompt template ──────────────────────────────────────────────────

SYSTEM_PROMPT = DEFAULT_SYSTEM_PROMPT


def resolve_effective_prompt(custom_prompt: str | None = None, prompt: str | None = None) -> str:
    """
    Resolve the effective prompt template by trimming custom_prompt and prompt first,
    then picking the first non-empty value with fallback to SYSTEM_PROMPT.
    """
    cp = custom_prompt.strip() if isinstance(custom_prompt, str) else ""
    p = prompt.strip() if isinstance(prompt, str) else ""
    if cp:
        return cp
    if p:
        return p
    return SYSTEM_PROMPT


class GeminiParser:
    """Handles picture book parsing using system Agent CLIs (agy or codex)."""

    def __init__(self) -> None:
        agy_path = shutil.which("agy")
        codex_path = shutil.which("codex")
        logger.info("GeminiParser initialized. agy: %s, codex: %s", agy_path or "Not found", codex_path or "Not found")

    async def parse_images(
        self,
        images: list[tuple[bytes, str]],
        question_count: int = settings.DEFAULT_QUESTION_COUNT,
        model: str | None = None,
        cli: str = "agy",
        custom_prompt: str | None = None,
        prompt: str | None = None,
    ) -> StoryParseResult:
        """
        Parse multiple picture book page images and return structured content using agy or codex CLI.
        Supports optional custom_prompt parameter, falling back to DEFAULT_SYSTEM_PROMPT.
        """
        cli_type = (cli or "agy").lower().strip()
        if cli_type == "agy":
            effective_model = normalize_agy_model(model or settings.GEMINI_MODEL)
        else:
            effective_model = normalize_codex_model(model)
        logger.info("Executing picture book parsing via CLI=%s (model: %s)...", cli_type, effective_model)

        # Determine effective prompt template (trim both fields first, select first non-empty value)
        base_prompt = resolve_effective_prompt(custom_prompt=custom_prompt, prompt=prompt)

        if "{question_count}" in base_prompt:
            try:
                formatted_prompt = base_prompt.format(question_count=question_count)
            except Exception:
                formatted_prompt = base_prompt.replace("{question_count}", str(question_count))
        else:
            formatted_prompt = base_prompt

        temp_dir = tempfile.mkdtemp()
        try:
            temp_paths = []
            for idx, (img_bytes, mime_type) in enumerate(images):
                ext = ".png" if "png" in mime_type else ".jpg"
                p = os.path.join(temp_dir, f"page_{idx+1}{ext}")
                with open(p, "wb") as f:
                    f.write(img_bytes)
                temp_paths.append(p)

            prompt = (
                f"Analyze the following picture book page images in order: {', '.join(temp_paths)}.\n"
                f"Return ONLY valid JSON matching this schema without any markdown formatting or explanations.\n"
                f"STRICT FORMAT RULES:\n"
                f"1. Do NOT use inner double quotes (\") inside strings; use single quotes (') instead.\n"
                f"2. Output strictly valid JSON. Do not wrap in markdown ```json ``` blocks.\n"
                f"JSON Schema:\n"
                f"{{\n"
                f'  "title": "Book Title",\n'
                f'  "theme": "Short Chinese summary",\n'
                f'  "vocabulary": [{{"word": "word", "phonetic": "/phonetic/", "meaning": "中文", "example_sentence": "sentence", "example_translation": "例句翻译"}}],\n'
                f'  "pages": [{{"page": 1, "sentences": [{{"en": "English sentence", "zh": "中文翻译"}}]}}],\n'
                f'  "questions": [{{"question": "English Question", "hint": "Hint", "answer": "Answer"}}]\n'
                f"}}\n\n"
                f"{formatted_prompt}"
            )

            if cli_type == "codex":
                codex_path = shutil.which("codex")
                if not codex_path:
                    raise ValueError("系统未找到 codex 命令，请确认 codex CLI 已安装并正确挂载。")
                cmd = [
                    "codex", "exec",
                    "--dangerously-bypass-approvals-and-sandbox",
                    "--ephemeral",
                ]
                if effective_model and effective_model.lower() not in ("default", "none"):
                    cmd.extend(["-m", effective_model])
                for p in temp_paths:
                    cmd.extend(["-i", p])
                cmd.append("-")  # Signal codex to read prompt from stdin

                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await proc.communicate(input=prompt.encode("utf-8"))
            else:
                agy_path = shutil.which("agy")
                if not agy_path:
                    raise ValueError("系统未找到 agy 命令，请确认 agy CLI 已安装并正确挂载。")
                cmd = [
                    "agy",
                    "--dangerously-skip-permissions",
                    "--disable-slash-commands",
                ]
                if effective_model:
                    cmd.extend(["--model", effective_model])
                cmd.extend(["--add-dir", temp_dir])
                cmd.extend(["-p", prompt])

                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await proc.communicate()

            if proc.returncode != 0:
                err_text = stderr.decode().strip()
                logger.error("%s CLI execution error: %s", cli_type, err_text)
                raise ValueError(f"{cli_type} CLI Error: {err_text}")

            out_text = stdout.decode().strip()
            data = _clean_and_parse_json(out_text)
            return StoryParseResult(**data)
        except Exception as e:
            logger.error("Picture book parsing failed via %s CLI: %s", cli_type, e)
            raise ValueError(f"绘本解析失败: {e}")
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)



