# ADR-0001：采用三应用服务与外部 MySQL

- **Status:** Accepted
- **Date:** 2026-08-26（由现有实现补录）

## 背景

Word Quest 同时需要浏览器交互、关系型持久化以及调用宿主机已有 Agent CLI 的多模态内容生成。共享 MySQL 已由宿主基础设施提供，项目不应重复管理数据库容器。

## 决定

系统拆分为 React/Vite frontend、Express backend 和 FastAPI ai_agent 三个应用服务；MySQL 作为外部共享基础设施。浏览器只通过 Backend 读写业务数据，AI service 不直接连接数据库。

## 后果

- 前端与 API、CLI 适配器可独立构建和排错。
- Backend 是业务数据写入边界，AI 输出必须经 Backend/前端确认后保存。
- 部署需要管理三个应用端口、内部网络和外部 `shared-infra` 网络。
- MySQL 迁移和备份必须明确目标数据库，Compose 不能控制共享数据库生命周期。
- 缺少认证时，三个服务的网络暴露必须限制在可信环境。

## 未选择方案

- 在浏览器直接调用 MySQL 或 Agent CLI：无法形成可控的秘密和验证边界。
- 把 MySQL 加入项目 Compose：会把共享基础设施生命周期错误地交给本项目。
- 把 AI 解析直接嵌入 Node 后端：会加重 Python/CLI 依赖耦合，降低故障隔离。

