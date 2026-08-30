# Word Quest 项目文档

Word Quest 是面向儿童英语学习的本地 Web 应用。学员按故事进入四类练习；管理员维护用户、故事、词汇、分组、全局游戏设置，并可通过本地 Agent CLI 从绘本图片生成结构化内容。

本目录只保存当前有效的项目知识。Agent 角色规则由 Request Hub 在启动前写入仓库根目录的 `AGENTS.md` 或 `GEMINI.md`，不在这里维护。

## 推荐阅读顺序

1. [REQUIREMENTS.md](REQUIREMENTS.md)：产品范围、角色和验收标准。
2. [ARCHITECTURE.md](ARCHITECTURE.md)：系统边界、组件和数据流。
3. 按任务阅读 [DATA_MODEL.md](DATA_MODEL.md)、[API.md](API.md)、[OPERATIONS.md](OPERATIONS.md)、[TESTING.md](TESTING.md) 与 [SECURITY.md](SECURITY.md)。
4. 复杂功能见 `features/`，已接受的架构决策见 `decisions/`。
5. [KNOWN_ISSUES.md](KNOWN_ISSUES.md) 记录尚未解决的实现问题。

`archive/` 不是默认事实源；只有追溯历史设计时才读取。

## 文档地图

| 位置 | 内容 |
|---|---|
| `REQUIREMENTS.md` | 当前产品需求、非目标和验收标准 |
| `ARCHITECTURE.md` | React、Express、FastAPI、MySQL 与 Agent CLI 的边界 |
| `DATA_MODEL.md` | 当前持久化实体、关系及 Schema 管理现状 |
| `API.md` | 后端和 AI 服务现有 HTTP 接口 |
| `OPERATIONS.md` | 配置、端口、启动、健康检查和数据操作原则 |
| `TESTING.md` | 测试层级、命令与测试数据隔离 |
| `SECURITY.md` | 信任边界、敏感资产与现存风险 |
| `KNOWN_ISSUES.md` | 当前可复现问题和临时规避方式 |
| `features/` | Story Chase、Word Matching、内容管理等复杂功能 |
| `decisions/` | 不应随日常实现改写的架构决定 |
| `runbooks/` | 专项人工操作手册 |
| `archive/` | 已失效的知识库、交接记录、规格和实施计划 |

## 权威性

- 文档定义预期行为；代码、路由、Schema 和测试反映当前可执行事实。
- 两者冲突时必须报告并在同一次变更中同步，不得用归档资料覆盖当前文档。
- Schema 当前仍分散在 `db/init.sql`、后端启动迁移和测试初始化中；具体风险见 [KNOWN_ISSUES.md](KNOWN_ISSUES.md)。

