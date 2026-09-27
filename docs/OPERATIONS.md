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
| 源码开发缺省 | 5174 | 由 `BACKEND_PORT`/`PORT` 决定，代码缺省 8010；Vite 代理缺省指向 8010 | 8020/自定义 | 由环境变量决定 |
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
| `FRONTEND_TLS_CERT_FILE`, `FRONTEND_TLS_KEY_FILE` | 可选的受信任 HTTPS 服务器证书与私钥路径；必须成对设置。局域网 iPad PWA 需要证书包含实际访问 IP 或域名。缺省 basic SSL 证书只适合本机开发。 |

### AI service

| 变量 | 用途 |
|---|---|
| `AI_AGENT_PORT` | 服务监听端口 |
| `GEMINI_MODEL` | agy 缺省模型名（历史名称，实际工具可配置） |
| `MODELS_CONFIG_PATH` | CLI/模型配置文件路径 |
| `MAX_IMAGES` | 单次最多图片数，代码缺省 10 |
| `MAX_IMAGE_BYTES`, `MAX_TOTAL_IMAGE_BYTES` | 单张图片及一次请求的总字节上限 |
| `MAX_IMAGE_PIXELS` | 单张图片最大像素数 |
| `MAX_CLI_OUTPUT_BYTES` | CLI 标准输出与错误输出的合计大小上限 |
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
BACKEND_URL=http://localhost:8010 npm run dev
```

```bash
cd ai_agent
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python run.py
```

若改用其他后端端口，则同时修改 `BACKEND_PORT`（或 `PORT`）和 `BACKEND_URL`。不要把真实环境值写回文档。

## 5. Compose 启动与日常标准构建环境 (5173)

本项目在引入“离线模式开关”与 iPad PWA 全屏桌面图标支持后，**Docker 容器环境（前端主机端口 5173，后端主机端口 8000）作为唯一且标准的日常运行与测试环境**。

### 为什么无需启动本地 Dev 环境（5174/8010）？
- **真实环境对齐**：iPad PWA 添加到主屏幕全屏运行、离线 Service Worker 缓存，以及 Web Speech API 均强依赖受信任的生产级 HTTPS 证书（挂载于 `frontend/.local-certs/`）。
- **静态资源预缓存**：Docker 前端镜像默认运行 `npm run serve:offline`（执行 `npm run build && vite preview`），自动构建生成带有 Service Worker 预缓存清单（`sw.js`）的完整生产包，而本地开发模式 `npm run dev` 默认不具备此离线生产特性。
- **单一数据源**：后端容器直连 `mysql-prod`（`wordquest` 数据库），数据与功能直接在同一真实环境中验证。

### 日常快速构建与更新命令

日常代码改动后，直接按需执行以下命令构建并部署到 5173 环境：

```bash
# 1. 前后端均有改动时：
docker compose up -d --build frontend backend

# 2. 仅改动前端界面、离线缓存或游戏玩法逻辑时（推荐，速度最快）：
docker compose up -d --build frontend

# 3. 仅改动后端控制器、API 路由或迁移脚本时：
docker compose up -d --build backend
```

> **构建优化**：Dockerfile 均配置了依赖分层缓存机制，只要 `package.json` 未发生变更，构建时会自动复用 npm 依赖层，快速完成编译与容器重载。

### 停止与管理应用服务：

```bash
# 查看容器状态
docker compose ps

# 停止应用服务（只影响本项目三个应用容器，不触碰共享 MySQL）
docker compose down
```

`down` 只应影响本项目三个应用容器；禁止通过本项目停止、删除或重建共享 MySQL。

## 6. 健康检查

```bash
curl http://127.0.0.1:8010/api/health
curl http://127.0.0.1:8080/health
```

前端可打开 `https://127.0.0.1:5174`（源码开发）或 Compose 映射地址。自签名开发证书会触发浏览器确认；它不适合作为生产证书。

离线安装与验证必须使用生产构建：在 `frontend/` 执行 `npm run serve:offline`，Docker 前端镜像也默认执行此命令。此命令先构建静态资源，再通过 Vite preview 提供 HTTPS 和 `/api` 代理；`npm run dev` 默认不会生成可离线启动的 PWA 缓存。先在 iPad 联网打开页面并等待 Service Worker 安装，再在应用的“iPad 离线模式与题库管理”中下载当前用户的故事与插图。保持同一访问地址，从 iPad 主屏幕图标重新打开，并在飞行模式下确认档案、故事和插图可用。首次访问、浏览器清理网站数据或更换地址后，须重新联网缓存。离线时依赖服务端的管理和歌曲接口不可用。

> **部署更新提醒**：每次通过 `docker compose up -d --build frontend` 部署新版本后，iPad 上的 PWA 由于此前已被 Service Worker 缓存，需在**联网状态下先打开应用下拉刷新一次（或重新进入）**，等待 Service Worker 静默拉取新资源包并激活后，再切换回离线模式使用。

登录后可在 Story Adventure Map 标题旁点击“下载离线题库”；旁边的“在线模式 · 管理”入口可切换离线和同步。账号选择卡片内也保留模式入口，游戏和管理页面的状态入口位于左下角。开关状态保存在当前浏览器的网站数据中；离线时应用请求被拦截，Service Worker 只返回本地缓存，关闭网页再打开仍保持离线。切回在线才恢复网络请求和待同步进度。浏览器或系统自身的网络活动不受网页控制；语音识别和语音合成在离线模式下禁用，以免触发外部服务。清理 Safari 网站数据会同时清除离线题库和开关状态。

首次在 iPad 安装或更新 PWA 时，题库下载与 Service Worker 接管是两个独立步骤。切换离线会等待已激活的离线程序；如果 Safari 尚未让它接管当前页面，应用先保持在线自动重载一次，接管后再开启离线。若证书不受信任或 Service Worker 无法激活，会显示明确错误，不能把仅有题库数据误认为可离线启动。

当前 Docker 前端的局域网证书由本机私有 CA 签发，服务器证书覆盖 iPad 使用的 `192.168.103.10`。iPad 必须使用这个 HTTPS 地址，并完成以下一次性设置：

1. 在 iPad Safari 打开 `https://192.168.103.10:5173/wordquest-local-ca.cer`，下载 WordQuest Local CA 根证书；也可从可信设备将该 `.cer` 文件传到 iPad。
2. 在 iPad“设置”中安装已下载的描述文件，然后在“设置 → 通用 → 关于本机 → 证书信任设置”中为 WordQuest Local CA 开启完全信任。Apple 要求额外开启此项，安装描述文件本身不够。
3. 重新用同一地址打开 Safari，确认不再出现证书警告，再进入主屏幕应用下载题库并开启离线。IP 改变后必须重新签发包含新 IP 的服务器证书；不要通过清除 Safari 网站数据尝试修复证书，因为那会删除离线题库。

根证书安装和完整信任步骤以 [Apple 的测试服务器 HTTPS 指南](https://developer.apple.com/library/archive/qa/qa1948/_index.html) 为准。私有 CA 密钥仅保存在本机 `frontend/.local-certs/`，不得提交、共享或挂载到容器；Compose 只读挂载服务器证书及服务器私钥。

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

歌曲 MP3 上传文件在 Compose 中持久化到 `wordquest_song_uploads` volume；备份/迁移环境时必须同时备份该 volume，否则数据库中的 `audio_url` 会失效。LRCLIB 查询只发送歌曲元数据，不发送音频文件。

局域网/iPad 接入细节见 [runbooks/wsl2-lan-access.md](runbooks/wsl2-lan-access.md)。
