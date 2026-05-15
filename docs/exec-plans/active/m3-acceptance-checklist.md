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

- 后台：`CollectionReviewsController` / `CollectionReviewsService`（`apps/api/src/modules/admin/collection-reviews/`）：列表（含 **`reviewReason`**；支持按 **`collectionNo`** 等与 `seriesId`/`batchId` 组合筛选）、**人工通过**、**人工驳回**（仅 `PENDING_MANUAL`）、**审核历史**（`GET .../collection-reviews/history?collectionNo=&contentVersionId=`，单藏品单次最多 200 条，超出返回 `REVIEW_HISTORY_LIMIT_EXCEEDED`）、**下架公开**（`POST .../content-versions/:contentVersionId/takedown`，仅 `APPROVED`+`PUBLISHED` → `TAKEDOWN`）。
- 管理端：`apps/admin` 中 `CollectionReviewsPage`（`/collections/reviews`）已对接 **`GET /admin-api/collection-reviews`**（分页、按状态筛选、**按藏品编号精确筛选**、列表含备注「说明」列、中文展示）、**`POST .../:reviewId/approve`** 与 **`POST .../:reviewId/reject`**（待人工行内通过 / 驳回及弹窗）；支持 **导出当前页为 UTF-8 CSV**（含 BOM）；行内 **「审核历史」** 弹窗对接 **`GET /admin-api/collection-reviews/history`**（按藏品编号 + 当前行内容版本筛选，时间升序）；对机审/人工已通过记录提供 **「下架公开」**（`POST .../content-versions/:id/takedown`）。
- 会员提交：`CONTENT_MANUAL_GATE_AFTER_MACHINE=1`（或 `true`/`yes`）时，同步机审占位通过后产生待人工队列；`docker-compose.yml` 中 api 服务已透传该变量（默认 `0`）。
- 会员读内容：`GET /member-api/my/collections/:id/content` 的 `currentVersion.contentReviewStatus` 为当前版本最新一条审核状态；小程序编辑页据此展示中文说明（含「待人工复核」）。
- 管理端默认筛选项为 **待人工复核**（进入页面即队列视图，可改为「全部状态」）。
- 契约：`packages/api-contracts/src/admin/collection-reviews/`（与实现同步）。
- 本地数据：`pnpm --filter @unicorn/api exec prisma db seed`（或仓库内等价命令）会写入 **`COL-SEED-PENDING-MANUAL`** 待人工复核演示行（固定主键，可重复执行）。
- 公开展示：`PublicCollectionsService`（`GET /public-api/collections/:slug`）：按**最高版本号的已审核内容**判断；若为 `TAKEDOWN` 则 **410** + `PUBLIC_COLLECTION_TAKEDOWN`（小程序 `public-api-errors` 映射为下架提示），否则在存在 `PUBLISHED` 快照时返回 200。
- 会员管理：`GET /admin-api/members` 分页列表（可选 `search`、`status`）；**`PATCH /admin-api/members/:memberId/status`** 冻结 / 解冻（`ACTIVE`↔`FROZEN`）；权限 **`members.read`** / **`members.manage`**（种子已授予超级管理员）；管理端 `/members` 对接真实数据，列表含微信渠道摘要与持有藏品数，行内「冻结 / 解冻」+ 确认弹窗。

- 人工可对 **进入人工队列** 的记录完成通过/驳回，且状态与公开展示可见性符合设计。
- 审核历史可按验收脚本查询并核对关键字段。
- 下架或类似处置后，公开读与 C 端表现符合安全与体验要求。

## 演示脚本（本地可照做）

**前置**：数据库可用（见根目录 `docker-compose.yml` 与 `apps/api/.env.example`）；`pnpm install` 后已生成 Prisma Client（`apps/api` 的 `postinstall`）；`pnpm --filter @unicorn/api exec prisma migrate deploy`（或团队约定的建库方式）+ **`pnpm --filter @unicorn/api exec prisma db seed`**；启动 `apps/api` 与 `apps/admin`；使用具备 **`collection_reviews.manage`**、**`members.read`** / **`members.manage`** 的后台账号（种子超级管理员默认具备）。

1. **待人工队列**：浏览器打开后台 **内容复核**（`/collections/reviews`），默认筛为「待人工复核」；确认存在种子 **`COL-SEED-PENDING-MANUAL`** 对应行（若无则检查 seed 是否成功执行）。
2. **人工通过**：对该行执行 **通过**（可选备注），刷新列表后该行不再处于待人工；在 **审核历史** 弹窗中可见时间线新增记录。
3. **人工驳回**（可选另一条待人工或自建数据）：对 `PENDING_MANUAL` 行执行 **驳回**，列表与历史应符合驳回语义。
4. **下架公开**：对 **机审或人工已通过且版本已公开** 的行使用 **下架公开**，确认理由可选；随后用 **`GET /public-api/collections/:slug`**（slug 取该藏品公开展示 slug）应返回 **410**，业务码 **`PUBLIC_COLLECTION_TAKEDOWN`**（与从未公开的 404 区分）；若在小程序侧验证，应出现下架相关中文提示。
5. **会员进人工开关**（可选）：将 API 环境变量 **`CONTENT_MANUAL_GATE_AFTER_MACHINE=1`** 后重启，会员提交内容在机审占位通过后进入 **`PENDING_MANUAL`** 且不公开；后台队列可见；验收后恢复为 `0` 以免干扰默认演示口径。
6. **会员管理**：打开 **会员管理**（`/members`），确认列表、搜索（防抖）、状态筛选、分页与 **列设置** 可用；对测试会员执行 **冻结**，使用该会员令牌调用 **`member-api`** 应返回 **`MEMBER_ACCOUNT_FROZEN`**（登录/鉴权路径已拦截非 `ACTIVE`）；再 **解冻** 恢复可操作。

**评论审核**：若本期纳入 M3，在本脚本末尾增加「评论列表 / 处置」步骤；若已划入 M4，在决策日志中注明，不在此脚本展开。

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
- 2026-05-15：新增 **`GET /admin-api/collection-reviews/history`**：按 `collectionNo`（必填）与可选 `contentVersionId` 返回审核时间线（`createdAt` 升序，含 `reviewSource`、`reviewedByDisplayName`、`reviewedAt`）；藏品或版本不存在分别 `COLLECTION_NOT_FOUND` / `CONTENT_VERSION_NOT_FOUND`；单请求超过 200 条记录时 `REVIEW_HISTORY_LIMIT_EXCEEDED`；内容复核列表行内 **「审核历史」** 弹窗对接该接口（默认按当前行版本筛选）。
- 2026-05-15：公开展示读 **`GET /public-api/collections/:slug`**：若藏品存在且**当前最高版本号的已审核内容**为 `TAKEDOWN`，返回 **410** + `PUBLIC_COLLECTION_TAKEDOWN`（与从未公开的 **404** `RESOURCE_NOT_FOUND` 区分）；小程序 `formatPublicApiErrorMessage` 映射为「该公开展示已下架…」。
- 2026-05-15：后台内容复核模块增加 **`POST /admin-api/collection-reviews/content-versions/:contentVersionId/takedown`**：将 `APPROVED`+`PUBLISHED` 版本标为 `TAKEDOWN`（与公开展示 410 联动）；管理端列表对机审/人工已通过行提供「下架公开」入口；契约 `TakedownPublishedContentVersionRequest/ResponseData`。
- 2026-05-15：新增 **`GET /admin-api/members`** 会员分页列表（`search`、`status`、`_count.ownedCollections`、微信绑定渠道摘要）；权限 **`members.read`**；`apps/admin` 会员管理页接入接口并支持筛选与分页。
- 2026-05-15：会员管理增加 **`PATCH /admin-api/members/:memberId/status`**（`UpdateMemberStatusRequest`）；权限 **`members.manage`**；管理端会员列表行内冻结 / 解冻与 `members.http.test` / `members.service.test` 覆盖。
- 2026-05-15：本清单 **「演示脚本」** 由占位改为可执行步骤（内容复核 / 历史 / 下架与公开 410 / 可选机审后进人工 / 会员列表与冻结拦截）；评论审核是否纳入本脚本见段末说明。
- 2026-05-15：后台「评论列表」「评论审核」仍为 **占位 mock**，尚无对应 **`admin-api` 评论治理接口**；与总览 M3「评论审核」尚未落地；**下一步需产品裁定**纳入本期实现或划入 M4，并在本清单「范围内事项」与演示脚本中同步收口表述。
