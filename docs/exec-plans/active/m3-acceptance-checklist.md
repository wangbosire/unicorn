# M3 验收清单

## 文档目标

定义 M3「审核治理闭环」的验收范围、条件与演示口径，与 [一期里程碑总览](./milestones-overview.md)、[V1 执行计划](./v1-exec-plan.md) 对齐；在 M2「内容展示闭环」完成后，作为 **人工运营与风险控制** 阶段的验收基线。

## 当前状态

- 状态：`draft`（待 M2 收口后改为 `active` 并补全实现快照）
- 上位计划：[V1 执行计划](./v1-exec-plan.md)
- 前置里程碑：M2（见 [M2 验收清单](./m2-acceptance-checklist.md)）

## 目标结果

- 与 M2 划清边界：**机审 + 公开展示** 已在 M2；M3 聚焦 **人工介入、历史可追溯、异常处置与会员侧体验兜底**。
- 形成可演示、可签字的验收脚本（后台为主，必要时含会员端只读/提示）。

## 范围内事项（与总览一致，可随实现细化）

- **人工复核**：待人工队列、通过/驳回、与 `CollectionContentReviewStage` / `CollectionContentReviewStatus` 一致的状态迁移。
- **审核历史**：运营侧可查询某藏品/某版本的审核轨迹（字段与保留策略以实现为准）。
- **下架与兜底**：`TAKEDOWN` 等公开态变更后，公开展示与小程序侧有明确失败/提示路径（契约与 HTTP 码对齐）。
- **会员管理**：后台对会员的基础查询与约束能力（以一期 PRD 为准）。
- **评论审核**（若一期纳入 M3）：风险评论的处置流；若拆到 M4，在决策日志中写明。

## 范围外事项（划入 M4 或后续）

- 转让闭环、通知中心、大盘仪表盘（见 [里程碑总览](./milestones-overview.md) M4）。
- 小程序内完整「社交评论」产品（若仅做审核入口，可在范围内单列）。

## 依赖关系

- 依赖 M2：存在可公开内容、审核记录与机审占位；`apps/api/src/modules/admin/collection-reviews/` 已具备列表与 **仅 `PENDING_MANUAL` 可人工通过** 等约束时，M3 在其上扩展工作台与历史。
- 若产品要求 **机审通过后必进人工** 才公开：属 M2/M3 交界；已在会员提交事务内提供开关 **`CONTENT_MANUAL_GATE_AFTER_MACHINE`**（`apps/api` 的 `MyCollectionsService.applySynchronizedMachineReview`），开启后机审占位通过会写入 `MANUAL` + `PENDING_MANUAL` 且不公开，与后台人工通过/驳回对齐。默认关闭以保持 M2「机审即发布」演示口径。

## 与现有实现的对接点（占位）

- 后台：`CollectionReviewsController` / `CollectionReviewsService`（`apps/api/src/modules/admin/collection-reviews/`）：列表（含 **`reviewReason`**；支持按 **`collectionNo`** 等与 `seriesId`/`batchId` 组合筛选）、**人工通过**、**人工驳回**（仅 `PENDING_MANUAL`）。
- 管理端：`apps/admin` 中 `CollectionReviewsPage`（`/collections/reviews`）已对接 **`GET /admin-api/collection-reviews`**（分页、按状态筛选、**按藏品编号精确筛选**、列表含备注「说明」列、中文展示）、**`POST .../:reviewId/approve`** 与 **`POST .../:reviewId/reject`**（待人工行内通过 / 驳回及弹窗）；支持 **导出当前页为 UTF-8 CSV**（含 BOM）。
- 会员提交：`CONTENT_MANUAL_GATE_AFTER_MACHINE=1`（或 `true`/`yes`）时，同步机审占位通过后产生待人工队列；`docker-compose.yml` 中 api 服务已透传该变量（默认 `0`）。
- 会员读内容：`GET /member-api/my/collections/:id/content` 的 `currentVersion.contentReviewStatus` 为当前版本最新一条审核状态；小程序编辑页据此展示中文说明（含「待人工复核」）。
- 管理端默认筛选项为 **待人工复核**（进入页面即队列视图，可改为「全部状态」）。
- 契约：`packages/api-contracts/src/admin/collection-reviews/`（与实现同步）。
- 本地数据：`pnpm --filter @unicorn/api exec prisma db seed`（或仓库内等价命令）会写入 **`COL-SEED-PENDING-MANUAL`** 待人工复核演示行（固定主键，可重复执行）。

## 验收结论标准（草案）

- 人工可对 **进入人工队列** 的记录完成通过/驳回，且状态与公开展示可见性符合设计。
- 审核历史可按验收脚本查询并核对关键字段。
- 下架或类似处置后，公开读与 C 端表现符合安全与体验要求。

## 演示脚本（待 M2 完成后补全步骤号）

- 预留：从 M2 已公开藏品切入 → 触发人工队列/下架等场景 → 后台操作 → 验证公开接口与会员侧表现。

## 出入口标准（草案）

### M3 入口条件

- M2 已通过（清单归档）。
- 本清单范围内事项与产品优先级在 M3 内达成一致（评论审核是否纳入等）。

### M3 出口条件

- 演示脚本可一次走通；关键接口与页面具备对应自动化测试（程度以实现为准）。
- 决策日志记录与 M2 的衔接结论（含机审后是否必人工，若适用）。

## 决策日志

- 2026-05-14：新增本清单骨架（`draft`），与里程碑总览 M3 对齐，供 M2 收口后展开实现快照与演示脚本。
- 2026-05-14：后台「内容复核」页接入审核列表真实接口（`listCollectionReviews`），为人工队列与后续行内操作打基础。
- 2026-05-14：内容复核页接入「人工通过」：`POST /admin-api/collection-reviews/:reviewId/approve`、备注弹窗与错误码中文映射。
- 2026-05-15：后端与后台接入「人工驳回」：`POST .../:reviewId/reject`（`MANUAL_REJECTED`、版本 `REJECTED`+`UNPUBLISHED`）；契约 `RejectCollectionReviewResponseData.reviewedAt` 与通过接口一致为毫秒时间戳；Vitest 补服务单测。
- 2026-05-15：新增 `collection-reviews.http.test.ts`（列表 / 通过 / 驳回的 HTTP 壳与拦截器包装校验）。
- 2026-05-15：`collection-reviews.http.test.ts` 补充 BizError 路径：`REVIEW_STATUS_INVALID`→400、`REVIEW_RECORD_NOT_FOUND`→404。
- 2026-05-15：后台内容复核列表失败时映射 `ApiError`（含 `INVALID_COLLECTION_REVIEW_STATUS`、鉴权相关码）并增加「重试」按钮。
- 2026-05-15：`collection-reviews.http.test.ts` 增加 `GET` 非法 `reviewStatus` → `INVALID_COLLECTION_REVIEW_STATUS`（400）用例，与列表页错误映射对齐。
- 2026-05-15：会员侧提交增加 **`CONTENT_MANUAL_GATE_AFTER_MACHINE`**：开启后机审占位通过进入 `PENDING_MANUAL` 且不公开；Compose 默认 `0`；`MyCollectionsService` 单测覆盖。
- 2026-05-15：`GET .../content` 增加 **`contentReviewStatus`**；小程序编辑页展示与刷新一致的中文审核说明；后台内容复核页 **默认筛选「待人工复核」**。
- 2026-05-15：`prisma/seed.ts` 幂等写入 **`COL-SEED-PENDING-MANUAL`** 一条 `PENDING_MANUAL` 审核记录，便于本地开箱验证后台队列。
- 2026-05-15：审核列表查询增加 **`collectionNo`** 精确筛选；`seriesId` 与 `batchId` 在服务层合并为同一 `collection` 条件，避免互相覆盖；后台内容复核页提供编号输入与「应用 / 清空」。
- 2026-05-15：审核列表项增加 **`reviewReason`**（契约 + 接口 + 后台表格「说明」列）。
- 2026-05-15：后台内容复核页支持 **导出当前页 CSV**（`src/lib/collection-reviews-csv.ts` + Vitest）；按钮文案标明仅当前页，避免与全量导出混淆。
