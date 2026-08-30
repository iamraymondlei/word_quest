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

## 3. 关系

```text
users ──< user_island_access >── islands ──< words
  │                                  │
  └──< user_island_progress >────────┘
  │
  └──< user_word_progress >──────── words

story_groups.name ──(逻辑关联)── islands.group_name
game_settings、version_history 为全局表
```

## 4. JSON 合同

- `story_passage_json`：数组元素至少应包含段落号、句子号、英文正文与中文翻译；前后端需容忍旧数据字段缺失。
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

