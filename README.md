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
- [docs/索引.md](./docs/索引.md) `docs/` 总索引。
- [架构总览.md](./架构总览.md) 顶层架构说明。
- [docs/产品理解.md](./docs/产品理解.md) 产品理解入口。
- [docs/设计.md](./docs/设计.md) 设计文档入口。
- [docs/前端研发.md](./docs/前端研发.md) 前端研发入口。
- [docs/执行计划.md](./docs/执行计划.md) 执行计划入口。
- [docs/exec-plans/completed/二期-通知与转让运营增强.md](./docs/exec-plans/completed/二期-通知与转让运营增强.md) 最近完成的二期阶段归档。
- [docs/exec-plans/completed/一期V1归档总览.md](./docs/exec-plans/completed/一期V1归档总览.md) 已归档一期总览。
- [docs/质量评分.md](./docs/质量评分.md) 质量治理入口。
- [docs/可靠性.md](./docs/可靠性.md) 可靠性入口。
- [docs/安全.md](./docs/安全.md) 安全入口。
- [docs/generated/索引.md](./docs/generated/索引.md) 生成文档入口。
- [docs/references/索引.md](./docs/references/索引.md) 参考资料入口。

## 当前阶段

一期主链路与运营治理相关任务已经完成收口，二期“通知编排与转让运营增强”也已完成阶段归档：

- `apps/admin`：已形成后台运营主链路页面基线，当前已补齐通知模板治理、派发明细/失败聚合、转让异常处置与运营留痕视图。
- `apps/miniapp`：已形成会员登录、激活、我的藏品、内容编辑、公开展示、消息与转让撤销链路。
- `apps/api`：已具备支撑 `admin-api`、`member-api`、`public-api` 的一期核心业务闭环，并完成通知异步派发、模板管理、转让运营处置接口。
- `docs/`：已沉淀一期 PRD、设计、执行计划、里程碑验收与二期阶段归档资料。

当前阶段更关注归档维护、技术债治理与下一阶段规划；如需判断“现在该看哪份计划”，优先从 [docs/执行计划.md](./docs/执行计划.md) 进入，再根据需要跳转到已归档索引。

## 工程约定

- Monorepo：`pnpm workspace`
- 任务编排：`turborepo`
- 后端：`NestJS + Prisma`
- 小程序：`TaroJS`
- 后台：`React + Vite + shadcn/ui`

## 本地开发（默认推荐：基础设施 Docker + 应用本地）

默认开发方式已经调整为：

- **MySQL 8** 和 **Redis 7** 用 Docker 跑
- **API / Admin / Miniapp H5** 用宿主机本地 Node 环境跑

### 1. 启动基础设施

```bash
pnpm infra:up
```

等价命令：

```bash
docker compose up -d mysql redis
```

基础设施信息：

- MySQL：库名 `unicorn`，账号 `root`，密码 `root123..`，宿主机端口 `3306`
- Redis：宿主机端口 `6380`

### 2. 启动后端

首次本地启动前准备：

```bash
cp apps/api/.env.example apps/api/.env
pnpm --filter @unicorn/api exec prisma db push
pnpm --filter @unicorn/api exec prisma db seed
```

启动 API：

```bash
pnpm dev:api
```

默认访问：`http://127.0.0.1:3000/api/...`

### 3. 启动前端

后台管理端：

```bash
pnpm dev:admin
```

- 访问：`http://127.0.0.1:5173/`
- 已默认将 `/api` 反代到 `http://127.0.0.1:3000`

小程序 H5：

```bash
pnpm dev:miniapp:h5
```

- 访问：`http://127.0.0.1:10086/`
- 已默认将 `/api` 反代到 `http://127.0.0.1:3000`

说明：

- `pnpm dev` 仍会按 workspace 原样并行跑各包原生 `dev` 脚本，但不包含基础设施启动；日常联调更建议显式使用上面的分步命令
- API 本地排障时，直接看当前终端输出即可；如需重置基础设施，可执行 `pnpm infra:down`

## 可选模式（全栈 Docker）

如需完整容器化演示或验收，可执行：

```bash
docker compose -f docker-compose.yml -f docker-compose.full.yml up -d --build
```

访问入口：

- 后台：`http://localhost:8080/`
- 小程序 H5：`http://localhost:8080/h5/`
- API 直连：`http://localhost:3000/api/`

若修改了 `apps/api/prisma/schema.prisma`、`apps/api/package.json`、根 `pnpm-lock.yaml`，或 `docker/Dockerfile.api` / `docker/api-entrypoint.sh`，请显式重新 build 对应镜像。

## 可选模式（Docker 热更新）

如需把 API / Admin / Miniapp H5 都放进容器内热更新，可执行：

```bash
docker compose -f docker-compose.yml -f docker-compose.hot.yml up --build mysql redis api admin-dev miniapp-h5-dev
```

访问：

- API：`http://localhost:3000/api/…`
- 后台（热更）：`http://localhost:5173/`
- 小程序 H5（热更）：`http://localhost:10086/`

说明：`admin-dev` / `miniapp-h5-dev` 通过环境变量将 `/api` 反代到 compose 中的 `api` 服务；若修改了 `apps/*/package.json` 或根 `pnpm-lock.yaml`，请重新 build dev 镜像。

## 测试（Monorepo）

当前仓库默认**不要求前端 UI 自动化测试**。前端项目以 `lint`、`typecheck`、`build` 与必要的纯函数 / 服务层单测作为交付基线；若后续某个项目确有必要引入 UI 自动化测试，应先在执行计划中单独说明。

- **根目录 `pnpm test`**：当前默认执行 API 与小程序单测，不拉起 Admin 浏览器测试，也不依赖 Playwright。
- **仅跑 API + 小程序**：`pnpm test:api-miniapp`。
- **仅跑其中一个包**：`pnpm --filter @unicorn/api test`、`pnpm --filter @unicorn/miniapp test`。

## 持续集成（GitHub Actions）

指向 `main` 的 push 与 pull request 会运行根目录 [.github/workflows/ci.yml](./.github/workflows/ci.yml)（支持 **workflow_dispatch** 手动触发）：当前默认执行 `pnpm test:api-miniapp`、`pnpm lint`、`pnpm typecheck`、`pnpm build`；不再将 Admin Playwright / 浏览器 UI 自动化测试作为必经门禁。依赖安装通过 [.github/actions/setup-pnpm/action.yml](./.github/actions/setup-pnpm/action.yml) 复用。

每日定时任务（可手动触发）见 [.github/workflows/stale.yml](./.github/workflows/stale.yml)，用于标记并关闭长期无活动的 Issue / PR。

依赖与流水线版本由 [.github/dependabot.yml](./.github/dependabot.yml) 每周检查：`github-actions`（**分组**为单条 PR）与根目录 **pnpm**（`npm` 生态；**生产 / 开发依赖分组**，仍由根 `pnpm-lock.yaml` 覆盖全 workspace）。

若在 GitHub 为 `main` 开启 **Required status checks**，当前仅需将 **`monorepo-quality`** 设为必过；若仓库中仍保留旧的 **`admin-browser-tests`** 规则，请同步移除，避免合并门禁继续依赖已废弃的前端 UI 自动化测试。
