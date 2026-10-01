# HTTP API

歌曲管理还提供 `POST /api/songs/:id/translate`：将 LRC 句子和目标单词发送到内部 `ai_agent`，生成并缓存整句中文、中文释义、音标和例句。请求体可选 `sentences`、`words`、`model`、`cli`；省略时使用歌曲当前内容。`ai_agent` 对应接口为 `POST /translate-song`。

## 1. 通用约定

- 后端基础路径为 `/api`，返回 JSON；CSV 导出除外。
- AI 服务是内部辅助服务，使用 JSON 和 `multipart/form-data`。
- 当前没有登录 Token、会话或路由级授权；传入 `user_id` 不能证明调用者身份。
- 大部分成功接口直接返回实体或 `{ success: true, ... }`，错误通常返回 `{ error: string }`；结构尚未完全统一。
- 客户端不得依赖原始数据库错误文字。当前仍有部分接口泄露内部错误，见 [KNOWN_ISSUES.md](KNOWN_ISSUES.md)。

## 2. Backend API

### 健康与版本

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 检查后端和数据库连接 |
| GET | `/api/versions` | 返回版本历史 |

### 用户

| 方法 | 路径 | 主要输入 | 说明 |
|---|---|---|---|
| POST | `/api/users/login` | `{ username, avatar? }` | 按用户名创建或取得档案，并初始化故事进度 |
| GET | `/api/users` | 无 | 按金币和 ID 返回用户列表 |
| POST | `/api/users/add-coins` | `{ user_id, coins }` | 增量修改金币 |
| POST | `/api/users/update-avatar` | `{ user_id, avatar }` | 修改 Buddy/头像 |
| DELETE | `/api/users/:id` | 路径 ID | 删除用户及级联数据 |

### 故事、词汇与分配

| 方法 | 路径 | 主要输入 | 说明 |
|---|---|---|---|
| GET | `/api/islands` | `user_id?`, `group?`/`group_name?` | 返回故事、词汇、分配和相关进度 |
| POST | `/api/islands` | 故事字段、`words?`, `user_ids?` | 按唯一 `name` 新建或更新故事；关联更新使用事务 |
| DELETE | `/api/islands/:id` | 路径 ID | 删除故事及其词汇、分配和学习进度 |
| PUT | `/api/islands/:id/access` | 学员 ID 数组 | 替换故事的学员分配 |
| POST | `/api/islands/upload-words` | CSV 文件及故事标识 | 为指定故事批量导入词汇 |
| POST | `/api/islands/upload-story-csv` | CSV 文件 | 批量导入故事数据 |
| GET | `/api/islands/export-errors` | 查询条件 | 导出错词 CSV |
| GET | `/api/words` | 查询参数 | 查询词汇 |

保留分组名 `ALL` 和 `__ALL__` 不能保存为故事分组。故事写入接受的 JSON 结构见 [DATA_MODEL.md](DATA_MODEL.md)。

### AI 绘本导入

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/islands/ai-models` | 代理/汇总可用 Agent CLI 与模型 |
| POST | `/api/islands/import-ai-story` | 接收最多 10 张图片及 `group_name`、`question_count`、`model`、`cli`、提示词；返回结构化草稿 |

后端上传限制为每个文件 5 MB。图片解析成功不等于已保存故事；前端仍需调用故事写入接口。

### 进度与奖励

| 方法 | 路径 | 主要输入 | 说明 |
|---|---|---|---|
| GET | `/api/progress` | `user_id?` | 返回单个或全部用户的星星统计 |
| GET | `/api/progress/stars` | `user_id?` | 星星统计别名 |
| POST | `/api/progress/update-stage` | `{ user_id, island_id, stage? , completed_stage? }` | 更新开放阶段和完成位图并重算星星 |
| POST | `/api/progress/log-error` | `{ user_id, word_id }` | 错词次数加一 |
| POST | `/api/progress/update-translation-stats` | `{ user_id, island_id, stats }` | 保存 Word Matching 统计 |
| GET | `/api/progress/get-translation-stats` | `user_id`, `island_id` | 读取 Word Matching 统计 |
| POST | `/api/progress/recalculate-stars` | `user_id` | 重算指定用户星星 |
| POST | `/api/progress/recalculate` | `user_id` | 重算接口别名 |

`completed_stage` 只允许 1–4；`stage` 只允许 1–5。

### 故事分组

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/groups` | 返回分组及故事数 |
| POST | `/api/groups` | 以 `{ name }` 新建分组 |
| PUT | `/api/groups/:id` | 重命名分组并更新故事的 `group_name` |
| DELETE | `/api/groups/:id` | 删除非 `General` 分组并把故事移回 `General` |

### 全局游戏设置

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/game-settings` | 返回数据库值与代码默认值合并后的设置 |
| PUT | `/api/game-settings` | 只更新 `DEFAULT_GAME_SETTINGS` 白名单内的键 |

数值设置按各键的业务范围校验；整数设置不接受小数。怪兽池只接受内置稳定标识且不得为空，AI 提示词不得为空且最长 20,000 字符。

### 插图与项目路线图

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/illustrations/:filename` | 从 MinIO 代理故事插图，并返回长期缓存响应头 |
| GET | `/api/roadmap` | 返回项目路线图任务；空表时写入并返回代码内置种子 |
| PUT | `/api/roadmap/:id` | 更新路线图任务状态、优先级、说明等可编辑字段 |

### 歌曲歌词学习

| 方法 | 路径 | 说明 |
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/songs` | 返回歌曲列表、歌词来源、状态、解析后的句子区间及 `assigned_user_ids`；支持 `?user_id=...` 过滤（普通学员仅可见已授权或公开歌曲，管理员可见全量） |
| POST | `/api/songs` | 以 `multipart/form-data` 上传 MP3；可附带 LRC，缺省时后端用歌曲元数据查询 LRCLIB，并返回候选版本；支持 `user_ids` 初始分配 |
| GET | `/api/songs/:id` | 返回单首歌曲及其歌词句子与 `assigned_user_ids` |
| PUT | `/api/songs/:id` | 保存管理员确认后的歌曲元数据、LRC、句子边界与分配学员 |
| DELETE | `/api/songs/:id` | 删除歌曲记录、上传的 MP3 及其学员权限关联记录 |
| GET | `/api/songs/:id/access` | 获取该歌曲的授权学员列表 `{ song_id, assigned_user_ids: number[] }` |
| PUT | `/api/songs/:id/access` | 更新该歌曲的授权学员列表 `{ user_ids: number[] }`（空数组表示向全员公开） |
| GET | `/api/songs/audio/:filename` | 流式播放受控的 MP3 文件 |

`POST /api/songs` 的 `audio` 最大 25 MB；`title`、`artist`、`duration` 必填，`album`、`target_words`、`user_ids` 和 `lrc`/`lrc_text` 可选。返回的 `syncedLyrics` 会被解析为 `segments`，没有精确匹配时由管理员选择候选或上传自有 LRC。`POST /api/songs/parse-lrc` 可预览解析结果。

### 单词宝库与独立词汇库 (Phase 9)

| 方法 | 路径 | 主要输入 | 说明 |
|---|---|---|---|
| GET | `/api/word-books` | Query: `userId?` | 获取词单列表（含单词数量、已关联用户 ID 列表 `assigned_user_ids`；普通学员过滤仅可见授权章节或公开章节，管理员可见全部） |
| POST | `/api/word-books` | `{ category?, title, description?, tags?, sort_order?, user_ids? }` | 创建新词单章节，支持指定书本系列分类与初始归属学员 |
| GET | `/api/word-books/:id` | 路径 ID | 获取指定词单详情 |
| PUT | `/api/word-books/:id` | `{ category?, title?, description?, tags?, sort_order?, user_ids? }` | 更新词单元数据及归属学员权限 |
| DELETE | `/api/word-books/:id` | 路径 ID | 删除词单及其所有单词、学员学习进度与学员权限关联 |
| GET | `/api/word-books/:id/access` | 路径 ID | 获取该词单章节的归属学员 ID 列表 `{ book_id, user_ids: number[] }` |
| PUT | `/api/word-books/:id/access` | `{ user_ids: number[] }` | 更新词单章节的归属学员权限列表（空数组表示向全体公开） |
| GET | `/api/word-books/:id/words` | 路径 ID, Query: `userId?` | 获取该词单下所有单词及生动趣味扩展详情 |
| POST | `/api/word-books/:id/words` | `{ words: [...] }` | 批量保存/导入词单下的单词集合 |
| PUT | `/api/vocabulary-words/:id` | `{ book_id?, word?, phonetic?, translation?, fun_sentences?, ... }` | 更新单个单词信息，支持修改所属章节 `book_id` 实现单词换章节 |
| DELETE | `/api/vocabulary-words/:id` | 路径 ID | 从词单中删除单个单词及其学员练习进度 |
| POST | `/api/vocabulary-words/batch-move` | `{ word_ids: number[], target_book_id: number }` | 批量调整单词所属章节，自动迁移到目标章节并保留学员发音/拼写进度 |
| POST | `/api/vocabulary-words/batch-delete` | `{ word_ids: number[] }` | 批量删除单词及其学员练习进度 |
| GET | `/api/word-books/:id/offline-package` | 路径 ID | 离线包下载端点（包含词单元数据与全量单词，前端存入 IndexedDB 供 PWA 离线使用） |
| POST | `/api/vocabulary-words/:id/progress` | `{ userId, mode, passed }` | 上报学员在特定模式（`reading` / `listening` / `spelling`）下的答题结果与掌握度 |
| POST | `/api/word-books/enrich-words` | `{ words: string[], model?, cli? }` | 调用内部 AI Agent 对生词列表进行儿童化扩展（音标、生动例句、反义词、同义词、词根、趣味词源） |

## 3. AI service API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/` | 本地验证页面 |
| GET | `/health` | 返回服务状态、默认模型和 parser 是否就绪 |
| GET | `/models?cli=agy\|codex` | 返回指定 CLI 的模型列表和默认模型 |
| POST | `/parse` | 解析绘本图片并返回 `APIResponse` |
| POST | `/enrich-vocabulary` | 对单词列表进行批量儿童化趣味扩展，返回结构化 JSON（释义、音标、趣味例句、反义词、同义词、词根拆解、趣味词源故事） |

`/parse` 表单字段：

- `images`：1–10 个 JPEG、PNG 或 WebP 文件；服务同时校验 MIME、实际图片格式、单文件/总字节数和像素上限。
- `question_count`：1–20，缺省值由环境变量控制。
- `cli`：`agy` 或 `codex`。
- `model`：可选模型名，必须受工具配置约束。
- `prompt` / `custom_prompt`：可选自定义提示词，`custom_prompt` 优先。

成功结构为 `{ success: true, data: ... }`；业务解析失败目前可能以 HTTP 200 返回 `{ success: false, error: ... }`。

## 4. 兼容与变更规则

- 修改路径、请求字段、返回结构或错误码时，同一变更必须更新前端调用、测试和本文。
- 新增管理写接口前必须先定义认证与授权边界。
- 文件接口必须同时限制文件数、单文件大小、媒体类型和解析后的内容规模。
- 不得新增返回密码、CLI 登录资料、代理值、主机路径或原始异常堆栈的接口。
