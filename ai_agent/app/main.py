"""
FastAPI application entry point.

Provides the /parse endpoint for picture book image analysis.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.schemas import APIResponse
from app.services.gemini_parser import GeminiParser, get_available_models, get_cli_config

logger = logging.getLogger(__name__)

# ── Lifespan: initialize shared resources ────────────────────────────

parser: GeminiParser | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize GeminiParser on startup."""
    global parser
    try:
        parser = GeminiParser()
        logger.info("GeminiParser ready")
    except ValueError as e:
        logger.error("Failed to initialize GeminiParser: %s", e)
        # Allow the app to start even without a valid key (for testing)
        parser = None
    yield
    parser = None


# ── FastAPI app ──────────────────────────────────────────────────────

app = FastAPI(
    title="英文绘本解析 Agent",
    description=(
        "接收英文绘本页面图片，提取英文文本并翻译成中文，"
        "生成生词表和阅读理解题目。目标读者：RAZ Level E 小学生。"
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow all origins for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files and serve index.html at root
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def read_index():
    """Serve the verification frontend page."""
    return FileResponse("static/index.html")


# ── Logging setup ────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)


# ── Routes ───────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "model": settings.GEMINI_MODEL,
        "parser_ready": parser is not None,
    }


@app.get("/models")
async def list_models(cli: str = "agy"):
    """
    Get available models for the specified CLI tool (agy or codex).
    Reads configuration from models_config.json.
    """
    cfg = get_cli_config(cli=cli)
    return {
        "success": True,
        "cli": cli,
        "models": cfg.get("models", []),
        "default_model": cfg.get("default_model", "gemini-3.7-flash-high" if cli == "agy" else "gpt-5.6-sol"),
    }


@app.post("/parse", response_model=APIResponse)
async def parse_story(
    images: list[UploadFile] = File(
        ..., description="绘本页面图片（1-10 张，支持 jpg/png/webp）"
    ),
    question_count: int = Form(
        default=settings.DEFAULT_QUESTION_COUNT,
        ge=1,
        le=20,
        description="生成的阅读理解题目数量",
    ),
    model: str | None = Form(
        default=None,
        description="指定模型名称（可选，留空则使用该 CLI 默认模型）",
    ),
    cli: str = Form(
        default="agy",
        description="指定 Agent CLI 引擎 ('agy' 或 'codex')",
    ),
    prompt: str | None = Form(
        default=None,
        description="自定义提示词模版（可选，留空使用预设提示词）",
    ),
    custom_prompt: str | None = Form(
        default=None,
        description="自定义提示词模版别名（可选）",
    ),
):
    """
    解析英文绘本页面图片。

    接收一组绘本图片，通过选定的 Agent CLI (agy 或 codex) 提取英文文本、翻译成中文、
    生成生词表和阅读理解题目。支持自定义提示词模版。
    """
    # Check parser availability
    if parser is None:
        raise HTTPException(
            status_code=503,
            detail="Story parser is not initialized. Ensure agy/codex CLI is installed and accessible.",
        )

    # Validate image count
    if len(images) == 0:
        raise HTTPException(status_code=400, detail="请至少上传 1 张图片。")
    if len(images) > settings.MAX_IMAGES:
        raise HTTPException(
            status_code=400,
            detail=f"最多支持 {settings.MAX_IMAGES} 张图片，当前上传了 {len(images)} 张。",
        )

    # Validate MIME types & read bytes
    images_to_parse: list[tuple[bytes, str]] = []
    for idx, img_file in enumerate(images):
        content_type = img_file.content_type or ""
        if content_type not in settings.ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"第 {idx + 1} 张图片格式不支持: {content_type}。"
                    f"支持的格式: {', '.join(settings.ALLOWED_IMAGE_TYPES)}"
                ),
            )
        data = await img_file.read()
        if len(data) == 0:
            raise HTTPException(
                status_code=400,
                detail=f"第 {idx + 1} 张图片为空文件。",
            )
        images_to_parse.append((data, content_type))

    cp = custom_prompt.strip() if isinstance(custom_prompt, str) else ""
    p = prompt.strip() if isinstance(prompt, str) else ""
    effective_prompt = cp or p or None
    logger.info(
        "Received %d image(s), question_count=%d, cli=%s, model=%s, custom_prompt_provided=%s",
        len(images_to_parse), question_count, cli, model, effective_prompt is not None
    )

    # Call story parser
    try:
        result = await parser.parse_images(
            images=images_to_parse,
            question_count=question_count,
            model=model,
            cli=cli,
            custom_prompt=effective_prompt,
        )
    except ValueError as e:
        logger.error("Parsing failed (validation): %s", e)
        return APIResponse(success=False, error=str(e))
    except Exception as e:
        logger.exception("Unexpected error during parsing")
        return APIResponse(success=False, error=f"解析失败: {e}")

    return APIResponse(success=True, data=result)

