# 数据模型

## 1. 总则

- 关系数据库为 MySQL 8，字符集使用 `utf8mb4`。
- 主业务数据库逻辑名称为 `wordquest`；实际部署连接名必须由环境变量决定。
- 当前 Schema 同时散落在 `db/init.sql`、`backend/src/index.ts` 启动迁移与 `backend/tests/globalSetup.ts`，三者尚未完全一致。以下内容按当前代码的并集描述，不代表初始化机制已合格。
- 所有外键关联的删除行为必须在执行前评估；禁止用测试初始化脚本连接开发或生产库。

## 2. 实体

### `users`

| 字段 | 含义 |
|---|---|
| `id` | 自增主键 |
| `username` | 唯一档案名，最大 50 字符 |
| `coins` | 累计/可用金币（当前代码直接增量更新） |
| `stars` | 已完成关卡计算出的累计星星 |
| `spent_stars` | 已花费星星 |
| `avatar` | Buddy 标识或兼容旧 Emoji |
| `is_admin` | 管理员标记 |
| `created_at` | 创建时间 |

用户名 `Admin` 会在启动迁移时被创建或提升为管理员。这是当前实现事实，不是安全认证。

### `story_groups`

| 字段 | 含义 |
|---|---|
| `id` | 自增主键 |
| `name` | 唯一分组名 |
| `created_at` | 创建时间 |

`General` 是不可删除/重命名的默认分组。故事通过名称而不是外键关联分组。

### `islands`

| 字段 | 含义 |
|---|---|
| `id` | 自增主键 |
| `name` | 唯一内部名称 |
| `group_name` | 分组名称，默认 `General` |
| `story_title` | 展示标题 |
| `story_passage` | 兼容用纯文本正文 |
| `story_passage_json` | 分段、句序、英文和中文翻译的 JSON |
| `story_questions` | 阅读问题、提示和答案 JSON |
| `sort_order` | 地图排序 |
| `created_at` | 创建时间 |

代码沿用 `island` 名称表示一个故事关卡包。

### `words`

| 字段 | 含义 |
|---|---|
| `id` | 自增主键 |
| `island_id` | 所属故事，删除故事时级联删除 |
| `word` | 练习单词，小写规范化 |
| `translation` | 中文释义 |
| `sentence` | 英文例句 |
| `sentence_translation` | 例句翻译 |
| `created_at` | 创建时间 |

唯一约束是 `(island_id, word)`。

### `user_island_access`

学员与故事的多对多分配表，联合主键 `(user_id, island_id)`，两端删除时级联删除。当前查询规则是：存在明确分配时只显示分配故事；完全没有分配记录时回退显示全部故事。

### `user_island_progress`

| 字段 | 含义 |
|---|---|
| `user_id`, `island_id` | 联合主键及两端外键 |
| `unlocked_stage` | 兼容旧进度的最高开放阶段，范围 1–5 |
| `completed_stages_mask` | 低四位对应关卡 1–4 是否完成 |
| `translation_stats_json` | Word Matching 的每故事统计 JSON 文本 |
| `updated_at` | 最后更新时间 |

旧记录若位图为 0，会按 `unlocked_stage` 推导已完成位图。新写入应以位图为准确完成事实。

### `user_word_progress`

联合主键 `(user_id, word_id)`；保存 `error_count`、`mastered` 和 `updated_at`。当前主要行为是错词接口把 `error_count` 原子加一。

### `game_settings`

以唯一 `setting_key` 和 JSON 字符串 `setting_value` 保存全局设置。当前允许的键由 `DEFAULT_GAME_SETTINGS` 决定，包括怪兽速度/等待/退后距离、连续错误上限、每页行数、初始生命、金币奖励、怪兽池和 AI 提示词模板。

### `version_history`

保存唯一版本号、发布日期及功能 JSON。当前只作为版本展示数据，不替代 Git 历史或 migration 版本。

### `project_roadmap_tasks`

保存项目路线图条目，包括任务 ID、标题、类别、状态、版本、日期、摘要、步骤、影响文件、技术说明、验证方式、优先级及放弃/替代方案。后端在表为空时写入代码内置种子；该表不是 migration 历史。

### `songs`

| 字段 | 含义 |
|---|---|
| `id` | 自增主键 |
| `title` / `artist` / `album` | 歌曲元数据 |
| `duration_seconds` | 上传音频时长，用于 LRCLIB 版本匹配 |
| `audio_url` | 后端受控的 MP3 播放地址 |
| `lrc_text` | 原始 LRC，便于重新解析和人工校对 |
| `lrc_source` | `lrclib` 或 `manual` |
| `lrclib_id` / `match_duration_seconds` | 外部匹配记录和匹配版本时长 |
| `status` | `READY` 或 `NEEDS_LYRICS` |
| `segments_json` | `{ id, startTime, endTime, text }[]` |
| `target_words_json` | 管理员确认的目标词数组，最多 20 个 |

句子结束时间通常取下一句开始时间，最后一句取音频时长；管理员可以覆盖边界。MP3 不被切割，所有逐句播放都通过同一 `audio_url` 的时间区间完成。

### `word_books` (单词宝库词单 - Phase 9)

| 字段 | 含义 |
|---|---|
| `id` | 自增主键 |
| `category` | 所属书本/第一层分类（如“Think”、“RAZ”、“General”） |
| `title` | 章节/词单名称（如“Class 1”、“Unit 2”） |
| `description` | 词单简介/适读年级说明 |
| `tags` | 标签/分类（如自然拼读、高频词） |
| `sort_order` | 排序权重 |
| `created_at` | 创建时间 |

### `user_word_book_access` (学员词单章节访问权限与归属 - Phase 9)

| 字段 | 含义 |
|---|---|
| `user_id` | 学员用户 ID，外键关联 `users.id`，级联删除 |
| `book_id` | 词单章节 ID，外键关联 `word_books.id`，级联删除 |
| `created_at` | 授权创建时间 |

联合主键为 `(user_id, book_id)`。若某一词单章节未关联任何学员，则默认为向全体公开；若存在关联学员，则仅所选学员与管理员可见。

### `vocabulary_words` (独立词汇库 - Phase 9)

| 字段 | 含义 |
|---|---|
| `id` | 自增主键 |
| `book_id` | 所属词单 ID，外键关联 `word_books.id` |
| `word` | 英文单词（小写规范化） |
| `phonetic` | 国际音标（如 `/ˈkjʊəriəs/`） |
| `translation` | 核心中文释义 |
| `fun_sentences_json` | 生动趣味例句 JSON 数组，包含英文与中文翻译 |
| `antonyms` | 反义词（逗号分隔或字符串） |
| `synonyms` | 同义词（逗号分隔或字符串） |
| `root_affixes` | 构词拆解说明，支持英文与生动童趣中文双语 JSON 结构：`{"en": "...", "zh": "..."}`（文字为规范童趣中文，前端发音时英文调用 en-US 英文发音，中文调用 zh-HK 粤语发音）或向下兼容纯文本 |
| `etymology` | 趣味通俗词源背景小故事，支持英文与生动童趣中文双语 JSON 结构：`{"en": "...", "zh": "..."}`（文字为规范童趣中文，前端发音时英文调用 en-US 英文发音，中文调用 zh-HK 粤语发音）或向下兼容纯文本 |
| `created_at` | 创建时间 |

### `user_vocabulary_progress` (学员独立单词掌握与错词记录 - Phase 9)

| 字段 | 含义 |
|---|---|
| `id` | 自增主键 |
| `user_id` | 学员用户 ID，外键关联 `users.id` |
| `word_id` | 单词 ID，外键关联 `vocabulary_words.id` |
| `book_id` | 所属词单 ID，外键关联 `word_books.id` |
| `mode` | 练习模式：`look_choose` (看句选义) / `listen_spell` (听音拼写) |
| `correct_count` | 答对次数 |
| `error_count` | 答错次数 |
| `mastered` | 掌握状态 (0 或 1) |
| `last_practiced_at` | 最近练习时间 |
| `created_at` | 创建时间 |

联合唯一约束为 `(user_id, word_id, mode)`。

### `songs` (原声歌曲库)

| 字段 | 含义 |
|---|---|
| `id` | 自增主键 |
| `title` | 歌曲名称 |
| `artist` | 歌手 / 艺术家 |
| `album` | 专辑名称 |
| `audio_url` | 音频访问 URL |
| `duration_seconds` | 歌曲总时长（秒） |
| `status` | 解析与就绪状态 (`READY` / `PROCESSING` / `DRAFT`) |
| `segments_json` | 逐句 LRC / 时间轴对齐切片 JSON 数组 |
| `target_words_json` | 歌曲重点核心生词 JSON 数组 |
| `translations_json` | 逐句歌词与单词释义结构化 JSON |
| `created_at` | 创建时间 |
| `updated_at` | 更新时间 |

### `user_song_access` (歌曲学员归属访问控制)

| 字段 | 含义 |
|---|---|
| `user_id` | 学员用户 ID，外键关联 `users.id` |
| `song_id` | 歌曲 ID，外键关联 `songs.id` |
| `created_at` | 授权创建时间 |

联合主键为 `(user_id, song_id)`。当歌曲未在 `user_song_access` 中配置任何用户时，默认为公开全员可见；若已配置则仅允许指定学员访问（Admin 始终可见全部）。

### 故事插图

插图文件保存在外部 MinIO 的 `wordquest-stories` bucket 中，数据库不保存二进制。`story_passage_json` 的句子元素可包含 `illustration_url`，通常指向 `/api/illustrations/<filename>`；AI 解析结果还可临时包含页面级 `illustration_box`。

## 3. 关系

```text
users ──< user_island_access >── islands ──< words
  │                                  │
  └──< user_island_progress >────────┘
  │
  └──< user_word_progress >──────── words
  │
  └──< user_vocabulary_progress >── vocabulary_words
  │
  └──< user_word_book_access >──── word_books ──< vocabulary_words
  │
  └──< user_song_access >───────── songs

story_groups.name ──(逻辑关联)── islands.group_name
game_settings、version_history、project_roadmap_tasks 为全局表
```

## 4. JSON 合同

- `story_passage_json`：数组元素至少应包含段落号、句子号、英文正文与中文翻译，并可包含 `illustration_url`；前后端需容忍旧数据字段缺失。
- `story_questions`：问题数组，每项包含问题、提示和答案。
- `translation_stats_json`：按 Word Matching 当前前端格式保存的对象；变更结构时必须兼容旧值或提供 migration。
- `game_settings.setting_value`：每个设置单独 JSON 编码；读取失败时后端会回退原始字符串。
- `version_history.features`：字符串数组 JSON。

## 5. Schema 变更规则

目标状态是使用有序、版本化、可重复执行的 migration：

1. migration 在空数据库和既有数据库均可安全执行。
2. 外键引用表必须先创建。
3. Schema、测试初始化和本文件必须在同一次变更同步。
4. 应用启动不得静默吞掉 migration 错误。
5. 迁移前备份，禁止 drop、truncate 或覆盖恢复，除非用户明确授权并确认目标库。
