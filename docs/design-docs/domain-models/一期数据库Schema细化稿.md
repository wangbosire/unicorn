# 数字藏品运营与展示平台一期数据库 Schema 细化稿

## 文档目标

只保留数据库设计判断规则、分阶段表清单和关键事务；字段级细节以 Prisma schema 为准。

## 真相源

- Prisma schema：`apps/api/prisma/schema.prisma`
- 生成摘要：`docs/generated/数据库Schema摘要.md`
- 本文用途：快速理解“有哪些表、为什么存在、先看哪里”

## 建模规则

- 主键统一使用稳定 ID；业务编号单独建字段
- 状态字段优先枚举化，不把业务状态塞进自由文本
- 审核记录、通知派发记录、转让记录等历史表默认追加写
- 高频查询走显式索引，不依赖隐式扫描
- 后台身份、会员身份、公开访问三套边界必须在表关系上可区分

## 分阶段表清单

### M1 必要表

- `admin_users`：后台用户
- `roles` / `permissions` / `admin_user_roles` / `role_permissions`：后台 RBAC
- `members`：会员主表
- `member_wechat_bindings`：微信绑定关系
- `series`：系列
- `issuance_batches`：发行批次
- `collections`：藏品主表
- `activation_codes`：激活码

### M2 必要表

- `collection_content_versions`：藏品内容版本
- `collection_content_review_records`：内容审核记录

### M3 预留表

- `collection_comments`：评论
- `collection_comment_review_records`：评论审核记录

### M4 预留表

- `collection_transfer_orders`：转让单
- `notification_messages`：站内消息
- `notification_dispatch_records`：派发记录

## 每类表关心什么

### 身份与权限

- 后台用 `admin_users + roles + permissions`
- 会员用 `members + member_wechat_bindings`
- 后台与会员不共表、不共 token、不共权限模型

### 发行与藏品

- `series` 管长期主题
- `issuance_batches` 管一次发行批次
- `collections` 是最终归属到会员的藏品主实体
- `activation_codes` 是“发放入口”，不是藏品本体

### 内容与审核

- `collection_content_versions` 保存可追溯的版本快照
- `collection_content_review_records` 保存审核轨迹
- 内容编辑态、发布态、审核态分开存，不复用一个状态字段

### 评论、转让、通知

- 评论、转让、通知都应保留历史与审计信息
- 审核、发送、接收等动作优先落记录表，而不是覆盖主表字段

## 关键关系

- 一个 `series` 下有多个 `issuance_batches`
- 一个 `issuance_batch` 下生成多个 `activation_codes`
- 一个 `activation_code` 对应一个待领取 `collection`
- 一个 `member` 可拥有多个 `collections`
- 一个 `collection` 可有多个 `collection_content_versions`
- 一个内容版本可有多条 `collection_content_review_records`
- 一个 `collection` 可有多条评论、转让和通知记录

## 索引规则

- 所有外键字段默认建索引
- 所有业务编号字段默认唯一或准唯一索引
- 高频筛选组合优先围绕：
  - `status`
  - `memberId`
  - `collectionId`
  - `seriesId`
  - `batchId`
  - `createdAt`
- 审核、通知、转让列表页优先支持“状态 + 时间”组合查询

## 一期关键枚举

- `SeriesStatus`
- `IssuanceBatchStatus`
- `ActivationCodeStatus`
- `CollectionStatus`
- `CollectionContentEditStatus`
- `CollectionContentPublishStatus`
- `CollectionContentReviewStatus`
- `MemberStatus`

## 关键事务

### 生成激活码

- 创建批次下的激活码
- 同步创建待领取藏品
- 保证激活码与藏品一一对应

### 激活藏品

- 校验激活码可用
- 绑定会员归属
- 更新激活码状态
- 更新藏品状态为已拥有

### 提交内容审核

- 生成或锁定目标内容版本
- 写入审核记录
- 更新编辑态、发布态、审核态

## AI 阅读建议

- 想看字段：直接读 `apps/api/prisma/schema.prisma`
- 想看模型意图：先读 [一期数据模型草案](./一期数据模型草案.md)
- 想看状态：读 [一期状态机总览](./一期状态机总览.md)
- 想看事件联动：读 [审核与通知事件设计](./审核与通知事件设计.md)

## 维护规则

- 不在本文复制整份表字段定义
- 新表先落 Prisma schema，再回填本文中的“分阶段表清单”
- 当表职责变化时更新本文；纯字段增减不要求同步展开
