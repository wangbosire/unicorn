# M2 验收清单

## 文档目标

本文档用于保留 M2「内容展示闭环」的验收范围、验收条件、演示脚本与出入口标准，与 [一期里程碑总览](../active/milestones-overview.md)、[V1 执行计划](../active/v1-exec-plan.md) 对齐，作为 **M2 已归档** 后的阶段验收基线与复盘依据。

## 当前状态

- 状态：`completed`（M2「内容展示闭环」已完成归档，2026-05-15；本次归档基于现有实现与清单收口，未额外补录新的端到端实测记录）
- 上位计划：[V1 执行计划](../active/v1-exec-plan.md)
- 前置里程碑：M1 已通过（见 [M1 验收清单（已归档）](../completed/m1-acceptance-checklist.md)）

## Monorepo 测试说明（仓库根 `pnpm test`）

根目录执行 `pnpm test` 时，当前默认只验证 **API** 与 **小程序** 单测；仓库已不再将前端 UI 自动化测试作为默认门禁。若未来某个前端项目需要恢复浏览器自动化测试，应在对应执行计划中单独说明。

当前默认验证 **API** 与 **小程序** 单测，可在仓库根目录执行 **`pnpm test:api-miniapp`**；或分别执行：

- `pnpm --filter @unicorn/api test`
- `pnpm --filter @unicorn/miniapp test`

更完整的说明见仓库根目录 [README.md](../../../README.md) 的「测试（Monorepo）」一节。

**CI**：根目录 [.github/workflows/ci.yml](../../../.github/workflows/ci.yml) 在 `main` 的 push/PR 上执行 `monorepo-quality`（`test:api-miniapp`、lint、typecheck、build）；前端 UI 自动化测试不再作为默认 CI 门禁。依赖安装复用 [.github/actions/setup-pnpm/action.yml](../../../.github/actions/setup-pnpm/action.yml)；支持 `workflow_dispatch`。长期无活动 Issue/PR 的定时清理见 [.github/workflows/stale.yml](../../../.github/workflows/stale.yml)。依赖与 Actions 版本见 [.github/dependabot.yml](../../../.github/dependabot.yml)（**分组**减少 PR 数量）。

## 目标结果

- 统一 M2 闭环的范围边界（与 M3「人工治理」区分）
- 统一「通过验收」的判断标准
- 为后端测试、小程序与公开展示联调提供同一套检查口径

## 范围内事项

- 藏品内容版本在会员侧可读、可写（草稿）
- 保存草稿、提交审核（进入机审队列）
- **机审**结果驱动公开可见性（通过则 `PUBLISHED` 且可公开读取；失败则保持不公开）
- **公开展示**：匿名（或设计约定身份）可访问的只读展示（以契约为准）

## 范围外事项（划入 M3 或后续）

- 后台人工复核工作台、批量下架、完整审核历史运营（见 `admin` `collection-reviews` 与 M3）
- 评论、转让、通知中心
- 微信正式登录态未就绪时，沿用 M1 文档中的 **mock 会员上下文** 联调前提亦可，但须在「联调前提」中写明

## M2 范围摘要

主链路：**已拥有藏品 → 编辑内容 → 提交审核 → 机审 → 公开展示可读**。

## 依赖关系

- 依赖 M1：会员身份、藏品 `OWNED`、首版内容版本（激活时已初始化，见激活服务与 Prisma 关系）
- `CollectionContentEditStatus` / `CollectionContentPublishStatus` / `CollectionContentReviewStage` / `CollectionContentReviewStatus` 组合需与实现一致，避免与 M3 人工阶段混淆
- 共享契约：`packages/api-contracts/src/member/my-collections`、`public/collections`（公开展示 DTO 已占位则实现应对齐）

## 关键状态与数据模型（验收核对用）

以下枚举来自 `apps/api/prisma/schema.prisma`，验收时应对照接口返回与库表：

| 维度 | 枚举 / 含义（节选） |
|------|---------------------|
| 编辑态 | `DRAFT`、`UNDER_REVIEW`、`REJECTED`、`APPROVED` |
| 公开态 | `UNPUBLISHED`、`PUBLISHED`、`TAKEDOWN` |
| 审核阶段 | `MACHINE`、`MANUAL` |
| 审核状态 | `PENDING_MACHINE`、`MACHINE_APPROVED`、`MACHINE_REJECTED`、`PENDING_MANUAL`、… |

**当前提交行为（已实现）**：`POST .../content/submissions` 将目标版本 `editStatus` 置为 `UNDER_REVIEW`，并创建 `reviewStage=MACHINE`、`reviewStatus=PENDING_MACHINE` 的审核记录（来源 `SYSTEM`）；随后在**同一事务内**执行同步机审占位并更新审核记录与版本的 `publishStatus` / `editStatus`（见下文「联调与测试说明」）。  
**可选后续**：将机审从同步占位改为异步编排或外部机审服务；若产品规定「机审通过后必进人工」，需调整分支与清单口径（通常属 M2/M3 交界）。

## 会员侧 HTTP 接口（当前实现）

网关或直连 API 时路径前缀以部署为准（本地常见为 `/api`）。控制器：`MyCollectionsController`，`base` 为 **`member-api/my/collections`**。

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `.../member-api/my/collections` | 分页列出当前会员藏品及最新内容版本摘要 |
| `GET` | `.../member-api/my/collections/:collectionId/content` | 读取可编辑的当前内容版本 |
| `POST` | `.../member-api/my/collections/:collectionId/content/drafts` | 保存草稿（`UNDER_REVIEW` 时拒绝） |
| `POST` | `.../member-api/my/collections/:collectionId/content/submissions` | 提交审核（body 含 `versionId`） |

会员上下文与 M1 一致：需先通过登录接口获取 `Bearer <memberAccessToken>`（见 M1 清单联调前提）。

## 公开展示（目标与现状）

- **契约**：`packages/api-contracts/src/public/collections/`。
- **实现**：`GET /api/public-api/collections/:slug`（`PublicCollectionsController`），`slug` 一期等同于 `collections.collection_no`；仅当存在 `PUBLISHED` 且 `APPROVED` 的内容版本时返回数据，否则 404。
- **验收要求（M2 出口）**：未发布内容不得通过该接口泄漏草稿字段；公开标识不可被轻易枚举（一期依赖 `collection_no` 不可预测性，后续可加 slug 盐或签名 URL）。

## 当前实现快照（截至仓库迭代）

**已具备**

- 会员「我的藏品」列表与内容读取、草稿保存、提交审核（见 `apps/api/src/modules/member/my-collections/`）；提交后在**同一事务内**执行同步机审占位：默认 `MACHINE_APPROVED` 并 **`APPROVED` + `PUBLISHED`**；标题含 `__MACHINE_REJECT__` 时为 `MACHINE_REJECTED` 并 **`REJECTED` + `UNPUBLISHED`**。
- `GET /api/public-api/collections/:slug` 公开展示读（见 `apps/api/src/modules/public/collections/` 与 `test/modules/public/collections/`）。
- 小程序：`pages/collection-edit`（草稿、提交审核、已公开时跳转公开展示）、`pages/collection-public`（匿名读；**封面预览**、正文与标题/摘要**去重**、slug 展示、`public-api` 错误中文映射、分享/下拉等）；`pages/collections` 列表提供编辑入口，**已公开**藏品额外提供「查看公开展示」；`pages/profile` 提供「前往我的藏品」快捷入口；**底部 tabBar**（首页 / 藏品 / 我的）与 `switchTab` 跳转约定；首页展示联调会话摘要并支持下拉刷新。
- 后台可分页查询审核记录列表；**人工通过**接口仅允许处理 `PENDING_MANUAL`（见 `CollectionReviewsService.approveCollectionReview`），与 M3 人工治理衔接。

**尚缺 / 可选优化**

- 小程序端自动化测试与端到端录制不是当前默认要求；现阶段以 **Vitest** 纯函数单测与构建校验为主。
- 可选：将机审从同步占位改为异步编排 / 外部机审服务（当前已在提交事务内同步落结果）。

## 联调与测试说明（机审占位）

- 同步机审默认 **自动通过并公开**：提交后版本 `APPROVED` + `PUBLISHED`，审核记录 `MACHINE_APPROVED`。
- 若标题包含子串 **`__MACHINE_REJECT__`**，机审 **拒绝**：版本 `REJECTED` + `UNPUBLISHED`，审核记录 `MACHINE_REJECTED`（仅用于联调与单测，后续接入真实策略时可删除该占位）。
- 公开展示读接口：`GET /api/public-api/collections/:slug`（与 `main.ts` 的 `api` 全局前缀一致；`slug` 一期等同于 `collections.collection_no`）。

## 验收结论标准

以下三类同时满足时，M2 可视为通过：

- 主路径可走通：**保存草稿 → 提交 → 机审通过 → 公开展示可读**
- 核心状态与数据正确（版本、编辑态、公开态、审核记录一致）
- 关键失败路径可控（鉴权、非所有者、重复提交、机审拒绝、非法参数）

## 业务流程验收项

### 1. 内容与版本（会员侧）

- 已 `OWNED` 藏品的会员可 `GET .../content` 读取当前版本。
- 可 `POST .../drafts` 保存草稿；再次 `GET` 可见更新。
- `UNDER_REVIEW` 时不得保存草稿（应返回业务错误，与实现一致）。
- `POST .../submissions` 后先进入 `UNDER_REVIEW` 并创建 `PENDING_MACHINE` 审核记录，随即由同步机审更新为终态（见上文「联调与测试说明」）。

### 2. 机审

- 机审**通过**：审核记录进入 `MACHINE_APPROVED`（及后续若需 `PENDING_MANUAL` 的产品分支），且仅当产品允许时内容可对访客公开。
- 机审**拒绝**：`MACHINE_REJECTED`，内容不公开，会员可回到可编辑态（`REJECTED`）并按规则重提（以实现为准）。

### 3. 公开展示

- 仅 `PUBLISHED`（且审核策略允许公开）的内容可通过公开展示接口读取。
- 未满足公开条件时访问公开接口应安全失败。

## 异常路径验收项

- 未携带有效会员上下文时，会员接口拒绝访问。
- `collectionId` 不属于当前会员：403 / 业务错误（与 `COLLECTION_NOT_OWNED_BY_MEMBER` 等一致）。
- 重复提交、错误 `versionId`、非法 JSON 等：明确错误码、不产生脏版本。

## 演示脚本（可先做 HTTP / 后台数据核对）

### A. 会员侧（可与小程序并行；可用 curl / Bruno）

前提：已完成 M1 激活，存在 `OWNED` 藏品与初始内容版本；已设置与 M1 相同的 mock 会员头。

1. `GET .../member-api/my/collections` 确认目标 `collectionId`。
2. `GET .../member-api/my/collections/{collectionId}/content` 记录 `currentVersion.id` 与 `editStatus`。
3. `POST .../member-api/my/collections/{collectionId}/content/drafts` 更新标题、摘要、`contentPayload`。
4. 再次 `GET .../content` 确认草稿已落库。
5. `POST .../member-api/my/collections/{collectionId}/content/submissions`，body `{"versionId":"<id>"}`。
6. 再次 `GET .../content` 或查库：版本应为 `APPROVED` + `PUBLISHED`，审核记录为 `MACHINE_APPROVED`（若标题含 `__MACHINE_REJECT__` 则为拒绝分支，见清单说明）。

### B. 公开展示（HTTP）

1. 在步骤 A 走通且为「自动通过」分支后，取该藏品的 `collection_no`（与 `slug` 相同）。
2. 浏览器无痕或使用 curl：`GET /api/public-api/collections/<collection_no>`，核对返回的 `title` / `summary` / `owner` 与已发布版本一致。
3. 对未发布藏品（或机审拒绝后的藏品）重复请求，应返回 404。

## 出入口标准

### M2 入口条件

- M1 已通过（见归档清单）。
- 本清单「关键状态与数据模型」与团队对产品口径（机审后是否必进人工）达成一致。

### M2 出口条件

- 演示脚本 A+B 可一次走通；小程序侧可按同一脚本在端上走通（或保留 HTTP 核对 + 小程序冒烟截图为验收附件）。
- `apps/api` 对草稿、提交、机审分支、公开读有对应测试；小程序已具备 `pnpm test`（Vitest）纯函数单测。

## 验收记录

- 2026-05-15：按当前仓库实现与 M2 清单收口结果完成文档归档；代码侧闭环结论保持为「会员内容编辑、提交机审、公开展示读取」已具备，后续新增能力转入 M3 或专题技术债跟踪。
- 2026-05-15：M2 归档后，M3 清单由 `draft` 切换为 `active`，后续阶段重点转向人工复核、审核历史、下架兜底与会员治理。

## 建议测试覆盖

### 后端（已有基础）

- `apps/api/test/modules/member/my-collections/`：列表、内容、草稿、提交、机审通过/拒绝分支。
- `apps/api/test/modules/public/collections/`：公开展示读服务与 HTTP 包装。

### 前端

- 小程序：`collection-edit`、`collection-public`（封面预览、正文去重、错误文案等）、列表与个人中心入口、已公开列表快捷入口、**底部 tabBar**；`pnpm test`（Vitest）覆盖 `src/lib` 纯函数。

## 决策日志

- 2026-05-14：在 M1 归档后新增本清单，将「机审 + 公开展示」与 M3「人工治理」在范围上拆开，便于分阶段验收。
- 2026-05-14：根据仓库实现补充会员侧 API 路径、Prisma 状态说明与「实现快照 / 缺口」，避免清单与代码长期脱节；公开展示以 `public-api` + 契约为准推动落地。
- 2026-05-14：落地同步机审占位与 `GET /api/public-api/collections/:slug`，并同步更新本清单演示步骤与「已具备」描述。
- 2026-05-14：小程序落地 `collection-edit` / `collection-public` 与列表入口；列表对 `PUBLISHED` 藏品增加「查看公开展示」；本清单「尚缺」与出口条件同步更新。
- 2026-05-14：`pages/profile` 增加「前往我的藏品」快捷入口；首页文案对齐 M2。
- 2026-05-14：配置微信端 `tabBar`（首页 / 藏品 / 我的）；`copy.patterns` 拷贝 `src/assets/tab` 图标；跳转 tab 页统一使用 `switchTab`；首页增加「消息中心」入口。
- 2026-05-14：编辑页对齐后端可保存/可提交态（`REJECTED` 可重提、`APPROVED` 可派生草稿）；下拉刷新与导航栏标题；`src/lib/collection-content-draft`；Vitest `test/lib`。
- 2026-05-14：首页 `getMemberSessionSummary` 联调摘要、下拉刷新；编辑页展示路由传入的 `collectionNo`。
- 2026-05-14：公开展示页封面 `previewImage`、slug 展示、正文与标题/摘要去重（`filterParagraphsDedupedAgainstTitleSummary`）及 Vitest 补测。
- 2026-05-14：根 `README` 增加「测试（Monorepo）」说明（Playwright / 按包过滤）；M2 清单补充 `pnpm test` 前置与**当前状态**（代码闭环 vs 验收签字）。
- 2026-05-14：根 `package.json` 增加 `test:api-miniapp`（并行跑 API + 小程序单测，不依赖 Admin Playwright）；根 `README` / M2 清单 / `apps/miniapp/README` 同步引用。
- 2026-05-14：根目录新增 `.github/workflows/ci.yml`（`main` 上 `test:api-miniapp` + lint + typecheck + Admin Playwright 安装与测试）；根 `README`「持续集成」与 M2 清单「Monorepo 测试说明」同步。
- 2026-05-14：CI 增加 `pnpm build`；删除 `apps/admin/.github/workflows/ci.yml`（该文件面向独立 admin 仓库，在 monorepo 根下不会执行，且曾引用根目录不存在的 `format:check`）。
- 2026-05-14：将 `stale` 工作流迁至根 `.github/workflows/stale.yml`（`actions/stale@v9`、`operations-per-run: 30`、`workflow_dispatch`）；删除 `apps/admin/.github/workflows/stale.yml`；修复 `app-sidebar` 中 `permissionKeys` 默认空数组引用导致的 `react-hooks/exhaustive-deps` 告警。
- 2026-05-14：CI 拆为并行 job `monorepo-quality` / `admin-browser-tests`；新增 composite [.github/actions/setup-pnpm/action.yml](../../../.github/actions/setup-pnpm/action.yml)；`ci.yml` 增加 `workflow_dispatch` 与 `permissions: contents: read`；根目录 Dependabot：`github-actions`（分组单 PR）+ `npm` 生产/开发分组（pnpm 全 workspace）每周，npm 提交信息 `chore` + `include: scope`。
- 2026-05-14：小程序抽离 `src/lib/member-mock-token.ts`（mock 令牌解析），`member-api` 复用；新增 Vitest `test/lib/member-mock-token.test.ts`。
- 2026-05-14：根 `README` 补充分支保护须勾选 `monorepo-quality` 与 `admin-browser-tests`；M2 清单增加「建议的下一步（收口 M2）」可执行项。
- 2026-05-14：新增 [M3 验收清单](../active/m3-acceptance-checklist.md)（`draft`）；[里程碑总览](../active/milestones-overview.md)、[PLANS.md](../../PLANS.md) 增加导航；M2「建议的下一步」补充 M2 归档后激活 M3 清单。
- 2026-05-15：本清单迁移至 `docs/exec-plans/completed/` 并改为 `completed`；里程碑总览、PLANS 导航与 M3 前置引用同步切换到归档路径。
- 2026-05-15：仓库测试口径调整为“前端项目默认不要求 UI 自动化测试”；根 `README`、`docs/FRONTEND.md`、CI 与本清单说明同步更新，不再以 Admin Playwright 作为默认门禁。
