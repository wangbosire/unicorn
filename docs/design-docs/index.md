# 设计文档索引

- [返回文档设计入口](../DESIGN.md)
- [架构总览](../../ARCHITECTURE.md)
- [Core Beliefs](./core-beliefs.md)
- [双用户体系与 API 边界](./user-systems-and-api-boundaries.md) 后台与会员体系隔离、接口边界与访问规则专题。
- [共享层设计](./shared-layer-design.md) `packages/*` 的职责边界与抽取原则专题。
- [架构总览](./architecture-overview.md) 当前一期的系统架构与项目结构基线。
- [一期数据模型草案](./data-model-outline.md) 一期核心实体、关系与建模原则。
- [一期数据库 Schema 细化稿](./database-schema-draft.md) 面向 Prisma 与数据库迁移的表结构细化设计。
- [一期状态机总览](./state-machines.md) 藏品、内容、评论、转让等核心状态定义与流转约束。
- [鉴权与权限设计](./auth-and-permissions.md) 后台、会员、公开访问三类权限设计说明。
- [审核与通知事件设计](./event-and-notification-design.md) 审核、通知、审计等事件化协同方案。
- [API 约定文档](./api-conventions.md) 接口边界、命名、错误码与版本约定。
- [接口清单草案](./api-endpoint-inventory.md) 按 admin-api、member-api、public-api 分组的一期接口清单。
- [接口契约草案](./api-contract-draft.md) M1、M2 主链路接口的请求 DTO、响应 DTO 与错误码映射。
- [`api-contracts` 包设计](./api-contracts-package-design.md) 共享接口契约包的目录结构、命名规则与抽取顺序。
- [代码注释与字段说明规范](./code-comment-standard.md) 前后端通用的注释、字段说明与模型文档写法。
- [后端测试策略](./backend-testing-strategy.md) `apps/api` 的 Vitest、supertest、目录镜像与测试分层规范。
