# HTTP API

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
| PUT | `/api/islands/:id/access` | 学员 ID 数组 | 替换故事的学员分配 |
| POST | `/api/islands/upload-words` | CSV 文件及故事标识 | 为指定故事批量导入词汇 |
| POST | `/api/islands/upload-story-csv` | CSV 文件 | 批量导入故事数据 |
| GET | `/api/islands/export-errors` | 查询条件 | 导出错词 CSV |
| GET | `/api/words` | 查询参数 | 查询词汇 |
| POST | `/api/words/upload` | 单个 CSV 文件 | 旧版通用词汇导入入口 |

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

## 3. AI service API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/` | 本地验证页面 |
| GET | `/health` | 返回服务状态、默认模型和 parser 是否就绪 |
| GET | `/models?cli=agy\|codex` | 返回指定 CLI 的模型列表和默认模型 |
| POST | `/parse` | 解析绘本图片并返回 `APIResponse` |

`/parse` 表单字段：

- `images`：1–10 个 JPEG、PNG 或 WebP 文件。
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

