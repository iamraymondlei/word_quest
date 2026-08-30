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
Express backend :8000
  ├── mysql2 ──► external MySQL 8
  └── HTTP ────► FastAPI ai_agent :8000 (Compose host :8080)
                    └── local process ──► agy or codex CLI
```

Compose 将三个应用服务加入默认网络，后端同时加入外部 `shared-infra` 网络访问 `mysql-prod`。本项目不创建或管理 MySQL 服务。

## 2. 组件职责

### Frontend

- React 18、TypeScript、Vite、Tailwind CSS。
- `App.tsx` 管理档案、地图、管理员和游戏视图切换，并用 `localStorage` 保存当前用户、主题和字号偏好。
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

- 保存用户、故事、词汇、访问分配、学习进度、分组、全局设置和版本历史。
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

### AI 绘本导入

1. 浏览器把 1–10 张图片、题目数、工具、模型和提示词上传到后端。
2. 后端转发 multipart 请求到 AI 服务。
3. AI 服务将图片放入一次任务的临时目录，调用选定 CLI，解析其 JSON 输出。
4. 结构化草稿返回浏览器；只有管理员确认后才通过故事接口写入数据库。

## 4. 技术约束

- Node.js 后端和前端使用各自的 `package.json`；根目录没有统一构建/测试编排。
- 后端默认端口 8000；Vite 源码配置端口 5174；AI 容器端口 8000。
- 本地开发代理的后端缺省目标是 `http://localhost:8010`，与 Compose 主机端口 8000 不同。
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
| 容器拓扑 | `docker-compose.yml` |

