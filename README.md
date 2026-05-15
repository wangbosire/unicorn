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

## 本地开发（Docker 全栈）

仓库根目录执行 `docker compose up -d --build`，会启动：

- **MySQL 8**：库名 `unicorn`，账号 `root`，密码 `root123..`，宿主机端口 `3306`。
- **API**：Nest 服务（容器内 `prisma db push` + `db seed` 后启动）；宿主机 **`http://localhost:3000`** 可直连（路径仍为 `/api/...`）；经网关访问见下。
- **web**：Nginx 静态站点（Admin + 小程序 H5 构建产物），映射 **http://localhost:8080**。

访问入口：

- 后台：`http://localhost:8080/`
- 小程序 H5：`http://localhost:8080/h5/`
- API：同源路径前缀 **`/api/`**（由 Nginx 反代到 API 容器），或直连 **`http://localhost:3000/api/`**。

排障：执行 **`docker logs -f unicorn-api`** 查看带栈日志；若需在 **HTTP 响应**里附带 `debug.stack`（仅 5xx），在 compose 或根目录 `.env` 中设置 **`API_DEBUG_ERRORS=1`**（默认在 `docker-compose.yml` 已为本地打开；勿用于生产）。

可选：在仓库根目录 `.env` 或 shell 中设置 `ADMIN_JWT_SECRET`（至少 16 字符），否则使用 compose 内默认值。

## 本地开发（Docker 热更新）

在容器内跑 **Nest watch**、**Vite HMR**、**Taro H5 webpack watch**，源码通过卷挂载进容器，改代码即生效（依赖或 lockfile 变更后需重新 build dev 镜像）。

```bash
docker compose -f docker-compose.yml -f docker-compose.hot.yml up --build mysql api admin-dev miniapp-h5-dev
```

建议**不要**同时启动生产静态站 `web`（避免误以为 8080 是热更入口）。若已启动可停掉：`docker compose stop web`。

访问：

- API：`http://localhost:3000/api/…`（与全栈模式相同）
- 后台（热更）：`http://localhost:5173/`
- 小程序 H5（热更）：`http://localhost:10086/`

说明：`admin-dev` / `miniapp-h5-dev` 通过环境变量将 **`/api`** 反代到 compose 中的 `api` 服务；卷挂载为**细粒度路径**（避免宿主机 `node_modules` 覆盖容器内 Linux 依赖）。若修改了 `apps/*/package.json` 或根 `pnpm-lock.yaml`，请执行 `docker compose ... build` 重建 dev 镜像。

## 本地开发（仅 MySQL + 宿主机 pnpm）

1. `docker compose up -d mysql`（或仅启动 mysql 服务）。
2. 复制 `apps/api/.env.example` 为 `apps/api/.env`，`DATABASE_URL` 指向 `127.0.0.1:3306`。
3. 在 `apps/api` 执行 `pnpm exec prisma db push` 与 `pnpm exec prisma db seed`。
4. API / Admin / 小程序在宿主机 `pnpm dev` 连接本机 MySQL 即可。

## 测试（Monorepo）

根目录 `pnpm test` 由 Turborepo 并行执行各 workspace 的 `test` 脚本。

- **`apps/admin`**：Vitest 浏览器模式依赖本机 **Playwright**。若报错提示缺少 Chromium / `chrome-headless-shell`，请在仓库根目录执行 `pnpm exec playwright install`，或先执行 `pnpm --filter @unicorn/admin run test:browser:install`，再重试根目录 `pnpm test`。
- **不跑 Admin、仅 API + 小程序**（CI / 本机快速校验，无需 Playwright）：`pnpm test:api-miniapp`。
- **仅跑其中一个包**：`pnpm --filter @unicorn/api test`、`pnpm --filter @unicorn/miniapp test`。

## 持续集成（GitHub Actions）

指向 `main` 的 push 与 pull request 会运行根目录 [.github/workflows/ci.yml](./.github/workflows/ci.yml)（支持 **workflow_dispatch** 手动触发）：**并行**两个 job——其一执行 `pnpm test:api-miniapp`、`pnpm lint`、`pnpm typecheck`、`pnpm build`；其二安装 Playwright 后执行 `pnpm --filter @unicorn/admin test`。依赖安装通过 [.github/actions/setup-pnpm/action.yml](./.github/actions/setup-pnpm/action.yml) 复用。

每日定时任务（可手动触发）见 [.github/workflows/stale.yml](./.github/workflows/stale.yml)，用于标记并关闭长期无活动的 Issue / PR。

依赖与流水线版本由 [.github/dependabot.yml](./.github/dependabot.yml) 每周检查：`github-actions`（**分组**为单条 PR）与根目录 **pnpm**（`npm` 生态；**生产 / 开发依赖分组**，仍由根 `pnpm-lock.yaml` 覆盖全 workspace）。
