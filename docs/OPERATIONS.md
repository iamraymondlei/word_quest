# 运行与运维

## 1. 运行依赖

- Node.js 与 npm：前端、后端构建和运行。
- Python 3：AI FastAPI 服务。
- MySQL 8：外部共享数据库，本项目不负责启动或删除。
- Docker/Compose：可选的三服务部署方式。
- 本地 `agy` 和/或 `codex` CLI：只有 AI 绘本导入需要，并要求已有可用登录资料。
- iPad 语音功能需要 HTTPS 和浏览器麦克风权限。

## 2. 端口

| 场景 | Frontend | Backend | AI service | MySQL |
|---|---:|---:|---:|---|
| 源码开发缺省 | 5174 | 由 `PORT` 决定，代码缺省 8000；Vite 代理缺省指向 8010 | 通常 8020/自定义 | 由环境变量决定 |
| 当前 Compose 主机 | 5173 | 8000 | 8080 | 外部服务，不映射于本 Compose |
| 容器内部 | 5174 | 8000 | 8000 | `mysql-prod:3306` |

本地开发端口存在历史差异，启动前应显式设置 `PORT` 或 `BACKEND_URL`，不要依赖互相冲突的默认值。

## 3. 环境变量

只在 `.env`、`.env.prod` 或安全的运行环境中设置实际值；文档和 Git 只保存变量名与占位符。

### Backend

| 变量 | 用途 |
|---|---|
| `NODE_ENV` | `development`、`test` 或 `production` |
| `PORT` | 后端监听端口 |
| `DB_HOST`, `DB_PORT` | MySQL 地址与端口 |
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Word Quest 专用数据库凭据与库名 |
| `TEST_DB_NAME` | 专用测试数据库名，必须与开发/生产库不同 |
| `AI_AGENT_URL` | 后端访问 AI 服务的基础 URL |

### Frontend

| 变量 | 用途 |
|---|---|
| `BACKEND_URL` | Vite `/api` 代理目标 |

### AI service

| 变量 | 用途 |
|---|---|
| `AI_AGENT_PORT` | 服务监听端口 |
| `GEMINI_MODEL` | agy 缺省模型名（历史名称，实际工具可配置） |
| `MODELS_CONFIG_PATH` | CLI/模型配置文件路径 |
| `MAX_IMAGES` | 单次最多图片数，代码缺省 10 |
| `DEFAULT_QUESTION_COUNT` | 缺省阅读题数 |
| `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` | 必要时的标准代理配置 |

不得在 Compose 中硬编码数据库密码、个人 WSL 地址或 CLI 凭据路径；当前遗留见 [KNOWN_ISSUES.md](KNOWN_ISSUES.md)。

## 4. 本地启动

安装依赖后分别启动：

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
BACKEND_URL=http://localhost:8000 npm run dev
```

```bash
cd ai_agent
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python run.py
```

若后端使用 8010，则相应修改 `PORT` 和 `BACKEND_URL`。不要把真实环境值写回文档。

## 5. Compose 启动

前提：外部 `shared-infra` 网络和 MySQL 已存在，`.env.prod` 已安全配置。

```bash
docker compose config
docker compose build
docker compose up -d
```

停止应用服务：

```bash
docker compose down
```

`down` 只应影响本项目三个应用容器；禁止通过本项目停止、删除或重建共享 MySQL。

## 6. 健康检查

```bash
curl http://127.0.0.1:8000/api/health
curl http://127.0.0.1:8080/health
```

前端可打开 `https://127.0.0.1:5174`（源码开发）或 Compose 映射地址。自签名开发证书会触发浏览器确认；它不适合作为生产证书。

## 7. 数据库初始化与迁移

- `db/init.sql` 是当前基础初始化脚本，但尚不能安全代表完整当前 Schema；不要在生产直接执行。
- 后端启动会补齐若干表/字段并写入默认设置；失败目前只记录日志。
- 在 [KNOWN_ISSUES.md](KNOWN_ISSUES.md) 所列问题修复前，空库初始化应由人工核对脚本顺序、目标数据库及备份后执行。
- 导入 SQL 前先验证目标主机、端口、库名和账号权限；未经明确授权不得覆盖、drop、truncate 或批量删除。

## 8. 备份与恢复原则

- 备份与恢复只针对 Word Quest 数据库，文件名包含时间戳和环境名。
- 恢复前验证备份完整性，并在隔离实例演练。
- 生产恢复必须先停止写入、记录恢复点并取得用户明确确认。
- 不在 Git、文档或 Agent 日志中保存含真实个人数据或密码的 dump。

局域网/iPad 接入细节见 [runbooks/wsl2-lan-access.md](runbooks/wsl2-lan-access.md)。

