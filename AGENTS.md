# 仓库导航

本仓库采用 Harness Engineering 工作方式组织。

## 参考链接

- Harness Engineering: [OpenAI 原文](https://openai.com/zh-Hans-CN/index/harness-engineering/)

## 入口原则

- 本文件保持简短，仅作为导航入口
- 详细知识沉淀在 `docs/` 中
- 计划、规范、设计、参考资料均纳入版本管理

## 文档命名规范

- 目录入口文件使用稳定短名，如 `index.md`、`DESIGN.md`、`PLANS.md`
- 专题文档优先使用语义清晰、可长期复用的短名，避免重复携带项目全名
- 执行计划文档优先使用阶段或里程碑短名，如 `v1-exec-plan.md`、`m1-acceptance-checklist.md`
- 已拆分出的高频专题，应在总览文档中保留摘要并将详细内容收敛到专题文档

## 查阅路径

- 涉及需求范围、业务目标、用户流程时，优先查看 `docs/PRODUCT_SENSE.md` 与 `docs/product-specs/`
- 涉及架构、模型、状态、接口、权限时，优先查看 `docs/DESIGN.md` 与 `docs/design-docs/`
- 涉及开发顺序、阶段目标、里程碑、验收标准时，优先查看 `docs/PLANS.md` 与 `docs/exec-plans/active/`
- 涉及质量、可靠性、安全要求时，分别查看 `docs/QUALITY_SCORE.md`、`docs/RELIABILITY.md`、`docs/SECURITY.md`
- 涉及外部资料、生成结果或工具参考时，查看 `docs/references/` 与 `docs/generated/`

## 文档导航

- [ARCHITECTURE.md](./ARCHITECTURE.md) 顶层架构入口。
- [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md) 产品理解入口。
- [docs/DESIGN.md](./docs/DESIGN.md) 设计文档入口。
- [docs/FRONTEND.md](./docs/FRONTEND.md) 前端研发入口。
- [docs/PLANS.md](./docs/PLANS.md) 执行计划入口。
- [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md) 质量治理入口。
- [docs/RELIABILITY.md](./docs/RELIABILITY.md) 可靠性入口。
- [docs/SECURITY.md](./docs/SECURITY.md) 安全入口。
- [docs/generated/index.md](./docs/generated/index.md) 生成文档入口。
- [docs/references/index.md](./docs/references/index.md) 参考资料入口。

## 当前状态

当前仓库已完成 Monorepo 初始化和三端基础脚手架搭建，处于“业务主链路准备落地”阶段：

- `apps/admin`：已完成后台导航信息架构和若干业务页面骨架
- `apps/miniapp`：已完成页面目录与基础入口预留
- `apps/api`：已完成模块化单体基础结构和三类 API 出口骨架
- `docs/`：已形成 PRD、架构总览和一期执行计划

当前优先级以文档澄清和一期核心业务闭环设计为主，详细内容以 `docs/` 为准。

## 编码规范

- 新增前后端代码默认要求带业务注释与字段说明。
- 共享类型、接口 DTO、Prisma 模型、状态字段必须优先补充说明。
- 统一规范见 [docs/design-docs/code-comment-standard.md](./docs/design-docs/code-comment-standard.md)。
