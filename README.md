# Unicorn

数字藏品运营与展示平台 Monorepo。

## 仓库结构

- `apps/admin`：后台管理端，基于 `shadcn-admin` 作为 UI 基座扩展。
- `apps/miniapp`：C 端小程序，基于 TaroJS。
- `apps/api`：后端 API，基于 NestJS + Prisma。
- `packages/*`：共享类型、配置、接口契约、工具与工程配置。
- `docs/*`：产品、设计、执行计划与参考文档。

## 文档入口

- [AGENTS.md](./AGENTS.md) 仓库导航与阅读入口。
- [ARCHITECTURE.md](./ARCHITECTURE.md) 顶层架构说明。
- [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md) 产品理解入口。
- [docs/DESIGN.md](./docs/DESIGN.md) 设计文档入口。
- [docs/FRONTEND.md](./docs/FRONTEND.md) 前端研发入口。
- [docs/PLANS.md](./docs/PLANS.md) 执行计划入口。
- [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md) 质量治理入口。
- [docs/RELIABILITY.md](./docs/RELIABILITY.md) 可靠性入口。
- [docs/SECURITY.md](./docs/SECURITY.md) 安全入口。
- [docs/generated/index.md](./docs/generated/index.md) 生成文档入口。
- [docs/references/index.md](./docs/references/index.md) 参考资料入口。

## 工程约定

- Monorepo：`pnpm workspace`
- 任务编排：`turborepo`
- 后端：`NestJS + Prisma`
- 小程序：`TaroJS`
- 后台：`React + Vite + shadcn/ui`
