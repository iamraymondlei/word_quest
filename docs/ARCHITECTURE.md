# 系统架构

## 1. 系统边界

Word Quest 由三个应用服务和一个外部 MySQL 实例组成：

```text
Browser
  │ HTTPS/HTTP + /api proxy
  ▼
React + Vite frontend :5174 (Compose host :5173)
  │ HTTP JSON / multipart
  ▼
Express backend :8010 (Compose container :8000)
  ├── mysql2 ──► external MySQL 8
  └── HTTP ────► FastAPI ai_agent :8000 (Compose host :8080)
                    └── local process ──► agy or codex CLI

Song learning additionally calls LRCLIB over HTTPS using song metadata only; the uploaded MP3 stays in the backend's controlled song upload directory.
```

Compose 将三个应用服务加入默认网络，后端同时加入外部 `shared-infra` 网络访问 `mysql-prod`。本项目不创建或管理 MySQL 服务。

## 2. 组件职责

### Frontend

- React 18、TypeScript、Vite、Tailwind CSS。
- `App.tsx` 管理档案、地图、管理员和游戏视图切换，并用 `localStorage` 保存当前用户、主题和字号偏好。
- 离线模式由本地开关持久化；`offlineMode.ts` 停止应用请求，`sw.js` 在离线时只读取预缓存/运行时缓存，学习数据由 IndexedDB 保存并在切回在线后同步。
- `UserSelect` 处理档案选择；`AdventureMap` 处理故事/分组/关卡入口；`GamePlay` 承载四个关卡；`ParentDashboard` 承载管理功能。
- Vite 开发服务器使用本地 HTTPS，并把 `/api` 代理到后端。

### Backend

- Express 4 + TypeScript，以功能路由分隔用户、故事、词汇、进度、分组、设置和版本接口。
- 控制器直接通过 `mysql2/promise` 连接池执行参数化 SQL；没有 ORM。
- 后端转发图片与管理员选择到 AI 服务，并将确认后的内容写入 MySQL。
- 启动时目前还会执行部分临时 Schema 补齐及默认数据写入；这不是理想的 migration 边界，见 [KNOWN_ISSUES.md](KNOWN_ISSUES.md)。

### AI Agent service

- FastAPI 接收绘本图片，验证图片类型/数量，调用本地 `agy` 或 `codex` CLI，并把输出解析为结构化故事数据。
- 可用工具、模型及默认模型来自 `ai_agent/app/models_config.json` 与环境变量。
- CLI 的登录资料通过宿主目录挂载进入容器。该服务不直接写数据库。

### MySQL

- 保存用户、故事、词汇、访问分配、学习进度、分组、歌曲、全局设置和版本历史。
- 数据模型见 [DATA_MODEL.md](DATA_MODEL.md)。MySQL 是共享基础设施，任何初始化、导入、备份或恢复都必须限制在 Word Quest 数据库。

## 3. 主要数据流

### 学习流程

1. 前端以用户名调用用户接口，取得或创建档案。
2. 前端按 `user_id` 和可选分组读取故事；后端联结故事、词汇、访问分配和该用户进度。
3. 游戏在浏览器完成语音、打字和动画交互。
4. 前端分别提交关卡完成、错词、翻译统计和金币变化；后端更新 MySQL。

### 管理员内容维护

1. 管理员在浏览器编辑故事、分段、问题、词汇、分组和学员分配。
2. 后端在事务中写入故事及其关联数据。
3. 读取时后端把 JSON 字段转换为前端可直接使用的对象/数组。

### 歌曲歌词学习

1. 管理员上传 MP3，并提交歌曲标题、歌手、专辑和浏览器读取的音频时长。
2. 后端用元数据调用 LRCLIB `/api/get`；无精确同步歌词时返回 `/api/search` 候选，不上传 MP3 到外部服务。
3. 管理员确认候选或上传/粘贴自有 LRC，后端解析为句子起止时间并保存 `songs`。
4. 学员端通过同一个 MP3 URL 设置 `HTMLAudioElement.currentTime`，在句子边界暂停或循环，不生成音频切片。

### 单词宝库与深度词汇学习 (Word Bank & Vocabulary Lab)

1. 管理员在后台多行粘贴生词（或上传 CSV），调用后端 AI 增强接口。
2. 后端委托 AI Agent 服务，利用大语言模型（Gemini）自动生成音标、儿童核心释义、趣味例句、反义词、词根拆解与通俗词源小故事。
3. 管理员在可编辑审查表格中微调后一键确认，后端将词单与词条持久化至 `word_books` 与 `vocabulary_words`。
4. 前端 IndexedDB 离线引擎同步缓存词库包，供 iPad PWA 在断网离线状态下运行。
5. 学员端调用原生 Web Speech API 进行零流量离线发音，并在“学单词”及看词选义、听音选义、听音拼写三大游戏中进行练习，成绩记录同步更新至 `user_word_progress`。

### AI 绘本导入

1. 浏览器把 1–10 张图片、题目数、工具、模型和提示词上传到后端。
2. 后端转发 multipart 请求到 AI 服务。
3. AI 服务将图片放入一次任务的临时目录，调用选定 CLI，解析其 JSON 输出。
4. 结构化草稿返回浏览器；只有管理员确认后才通过故事接口写入数据库。

## 4. 技术约束

- **标准运行与测试环境**：自支持 PWA 离线模式与 iOS 桌面全屏添加后，日常测试与实际使用统一以 Docker Compose 映射的 `https://<host>:5173`（前端）和 `http://<host>:8000`（后端）为准。源码级开发端口（5174/8010）仅用于隔离排查。
- Node.js 后端和前端使用各自的 `package.json`；根目录没有统一构建/测试编排。
- 后端源码开发默认端口 8010；Vite 源码配置端口 5174；AI 源码开发默认端口 8020。
- Compose 中后端容器与 AI 容器均监听 8000，主机分别映射为 8000 和 8080；前端在 Docker 中运行 `npm run serve:offline`，通过 5173 端口对外提供带真实 TLS 证书的 HTTPS 服务。
- Web Speech API 在 iPad Safari 上需要 HTTPS；Vite 使用 basic SSL 插件提供开发安全上下文。
- Story Chase 和 Space Defender 依赖电脑实体键盘，前端同时在入口和游戏根组件检查设备。
- 系统目前没有统一身份认证、授权中间件或 CSRF 防护，只适合受控本地网络。

## 5. 代码事实源

| 事实 | 位置 |
|---|---|
| HTTP 路由和进程启动 | `backend/src/index.ts`、`backend/src/routes/` |
| 数据库连接与启动迁移 | `backend/src/config/db.ts`、`backend/src/index.ts` |
| 基础 Schema | `db/init.sql` |
| 测试 Schema | `backend/tests/globalSetup.ts` |
| 前端入口和模式映射 | `frontend/src/App.tsx`、`frontend/src/components/AdventureMap.tsx` |
| AI 工具调用 | `ai_agent/app/main.py`、`ai_agent/app/services/gemini_parser.py` |
| 插图裁切、存储和代理 | `ai_agent/app/services/image_cropper.py`、`ai_agent/app/services/storage.py`、`backend/src/routes/illustrationRoutes.ts` |
| 项目路线图 | `backend/src/controllers/roadmapController.ts`、`frontend/src/components/ProjectRoadmap.tsx` |
| 容器拓扑 | `docker-compose.yml` |
