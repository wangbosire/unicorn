# 评论治理后端落地计划

## 文档目标

在当前 M3 审核治理闭环基本完成后，为后续评论治理能力补充一份可执行的后端落地计划，明确 Prisma 模型、接口边界、状态机映射、测试范围与实施顺序，避免直接进入“先写接口占位、后补模型”的失序开发。

## 当前状态

- 状态：`active`
- 执行顺位：**M3 审核治理闭环收口后的第一优先级**
- 上位计划：[V1 执行计划](./v1-exec-plan.md)
- 关联里程碑：
  - [M3 验收清单](./m3-acceptance-checklist.md)
  - [里程碑总览](./milestones-overview.md)
- 背景说明：当前仓库已完成评论 Prisma 模型、三类 API 服务、种子演示数据与后端自动化测试；现阶段主要缺口转为 **Admin 页面从静态 mock 切换到真实接口**，以及后续会员端 / 公开端的交互补齐。

## 目标结果

- 将现有评论治理能力收敛成可演示、可回归、可继续扩展的专项基线
- 落地并稳定一期评论主链路：
  - 会员发表评论
  - 会员回复评论
  - 公开评论列表
  - 后台评论列表
  - 后台评论审核队列
  - 后台人工通过 / 驳回 / 屏蔽评论
- 补齐 Admin 端页面对接、专项回归命令与执行文档
- 为后续消息通知联动保留清晰扩展点，但本计划不直接实现通知中心

## 范围内事项

- 评论主表与评论审核记录表设计
- 评论状态枚举与审核状态迁移
- `member-api` / `public-api` / `admin-api` 评论接口契约与实现
- 最小联调种子数据与 Vitest 覆盖
- `prisma db seed` 后后台评论审核队列默认可看到一条 `PENDING_MANUAL` 演示评论
- 与会员冻结、公开展示、内容版本发布态的联动约束

## 范围外事项

- 点赞、收藏、举报、删除后回收站等增强互动能力
- 评论通知消息发送
- 评论敏感词服务、外部机审服务接入
- 评论搜索、排序权重、大盘统计
- 转让、消息中心等其他业务域实现

## 依赖关系

- 依赖已稳定的 `Collection`、`CollectionContentVersion`、`Member`、`AdminUser` 模型
- 依赖公开展示能力已可按 `collectionNo` / `slug` 提供公开内容
- 依赖会员冻结逻辑已在 `member-api` 鉴权中生效，评论写接口必须复用这一约束
- 依赖现有审核模式：内容审核已形成 `SYSTEM / ADMIN`、`PENDING / APPROVED / REJECTED` 一致表达，评论审核优先复用同类概念

## 设计原则

- 先落地最小闭环，不一次性做成“内容审核的评论版复制品”
- 评论审核与内容审核保持术语一致，但避免过度耦合
- 公开侧只读取已通过且已发布的评论
- 评论回复最多支持二级，不向下递归扩展无限层
- 后台接口先覆盖治理能力，不为后台页面结构定制过深 DTO

## 推荐实施顺序

### 阶段 1：模型与契约落地

- 在 Prisma 中新增：
  - `CollectionComment`
  - `CollectionCommentReviewRecord`
- 新增评论状态枚举
- 新增 `packages/api-contracts` 评论相关目录与基础 DTO

交付结果：

- Prisma schema、contracts、种子数据与枚举定义可编译通过
- 当前状态：**已完成**

### 阶段 2：会员评论主链路

- `POST /member-api/collection-comments`
- `POST /member-api/collection-comments/:commentId/replies`
- 基础归属校验与会员冻结拦截
- 简化机审占位策略

交付结果：

- 登录会员可在已公开藏品下发表评论或回复
- 当前状态：**后端已完成，前端交互待补齐**

### 阶段 3：公开评论读取

- `GET /public-api/collections/:slug/comments`
- 仅返回已公开评论
- 返回一级评论及其有限回复视图

交付结果：

- 公开展示页可读取评论列表
- 当前状态：**后端已完成，前端展示待补齐**

### 阶段 4：后台评论治理

- `GET /admin-api/collection-comments`
- `GET /admin-api/collection-comments/reviews`
- `POST /admin-api/collection-comments/:commentId/approve`
- `POST /admin-api/collection-comments/:commentId/reject`
- `POST /admin-api/collection-comments/:commentId/block`

交付结果：

- 后台可完成评论审核与屏蔽治理闭环
- 当前状态：**后端已完成，Admin 页面正在从静态 mock 切换为真实接口**

## 当前执行重点

- 先完成 `apps/admin` 评论列表 / 评论审核页对接真实接口
- 补充评论治理专项回归命令，建议统一从仓库根执行 `pnpm test:comments`
- 在页面接通后，再决定是否继续推进小程序 / 公开端评论交互

## 数据模型建议

### `CollectionComment`

- `id`
- `collectionId`
- `contentVersionId`
- `memberId`
- `parentCommentId`
- `rootCommentId`
- `content`
- `status`
- `publishedAt`
- `createdAt`
- `updatedAt`

说明：

- 一级评论：`parentCommentId` / `rootCommentId` 为空
- 二级回复：`parentCommentId` 指向父评论，`rootCommentId` 指向一级评论
- 评论需绑定 `contentVersionId`，保留评论时的公开内容快照上下文

### `CollectionCommentReviewRecord`

- `id`
- `commentId`
- `reviewStatus`
- `reviewSource`
- `reviewReason`
- `reviewedByAdminUserId`
- `reviewedAt`
- `createdAt`

## 状态建议

### 评论状态

- `PENDING_MACHINE`
- `MACHINE_APPROVED`
- `MACHINE_REJECTED`
- `PENDING_MANUAL`
- `MANUAL_APPROVED`
- `MANUAL_REJECTED`
- `BLOCKED`

### 建议状态迁移

- 会员提交评论 -> `PENDING_MACHINE`
- 机审通过 -> `MACHINE_APPROVED`
- 机审拒绝 -> `MACHINE_REJECTED`
- 机审疑似异常 -> `PENDING_MANUAL`
- 人工通过 -> `MANUAL_APPROVED`
- 人工驳回 -> `MANUAL_REJECTED`
- 已公开评论被后台治理 -> `BLOCKED`

## 接口清单对齐

### `member-api`

- `POST /member-api/collection-comments`
- `POST /member-api/collection-comments/:commentId/replies`

### `public-api`

- `GET /public-api/collections/:slug/comments`

### `admin-api`

- `GET /admin-api/collection-comments`
- `GET /admin-api/collection-comments/reviews`
- `POST /admin-api/collection-comments/:commentId/approve`
- `POST /admin-api/collection-comments/:commentId/reject`
- `POST /admin-api/collection-comments/:commentId/block`

## 验收标准

- Prisma schema 与 `@unicorn/api-contracts` 编译通过
- 评论主链路具备 controller/service/http 三层自动化覆盖
- 会员冻结后无法发表评论
- 未公开内容或不存在公开展示页的藏品不可评论
- 后台可对待人工评论完成通过 / 驳回
- 后台可对已公开评论执行屏蔽
- 公开接口不会泄露未通过评论

## 风险与对策

- 风险：评论状态如果和内容审核状态完全复用，容易把实现做重
- 对策：评论域独立建表与枚举，但沿用相同命名风格与错误码习惯

- 风险：公开评论读取若直接递归查询，容易导致 DTO 复杂与性能失控
- 对策：一期只支持两层评论，并在接口中明确返回结构

- 风险：通知中心尚未落地，评论审核结果通知链路容易半截
- 对策：本期只保留事件注释与扩展位，不在本计划中实现消息派发

## 决策日志

- 2026-05-18：新建本计划，作为评论治理从“清单占位”走向“真实后端实现”的执行入口；当前评论能力暂不直接开写接口，先按本计划完成模型与契约收口。
- 2026-05-18：按代码现状回写计划口径：评论 Prisma 模型、三类 API、种子数据与后端测试已落地；当前第一缺口转为 Admin 页面对接真实接口与专项回归基线。
