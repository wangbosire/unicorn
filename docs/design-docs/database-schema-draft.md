# 数字藏品运营与展示平台一期数据库 Schema 细化稿

## 文档目标

本文档用于将一期核心数据模型进一步细化到数据库 Schema 设计层，作为 `apps/api/prisma/schema.prisma` 的直接设计依据。

## 设计范围

本文档重点覆盖 M1 到 M2 所需的核心表结构，并对后续 M3、M4 保留扩展位：

- 后台身份域
- 会员域
- 发行域
- 藏品域
- 内容版本与审核域
- 评论、转让、通知预留位

## 建库原则

- 主键统一使用字符串 ID，便于跨系统扩展
- 对外展示编号与内部主键分离
- 所有关键表保留 `createdAt`、`updatedAt`
- 所有关键状态字段使用显式枚举
- 高频查询字段显式建立唯一索引或普通索引
- 审核、转让、通知等追溯链路保留操作人和时间

## 命名规则

- 藏品主链路相关表统一使用 `collection_` 前缀
- Prisma model 命名与表名语义保持一致
- 通用通知、后台身份、会员身份等非藏品专属表不强制使用 `collection_` 前缀

## 推荐主键与编号策略

### 主键

- `id`：使用 `cuid` 或 `uuid`

### 业务编号

- `seriesNo`
- `batchNo`
- `collectionNo`
- `memberNo`
- `transferNo`

原则：

- 业务编号对外展示，可读且稳定
- 主键仅用于内部关联
- 激活码 `code` 本身就是业务唯一标识

## M1 必要表

### `admin_users`

字段建议：

- `id`
- `account_no`
- `username`
- `display_name`
- `password_hash`
- `status`
- `last_login_at`
- `created_at`
- `updated_at`

索引建议：

- `uk_admin_users_account_no`
- `uk_admin_users_username`

### `roles`

字段建议：

- `id`
- `role_key`
- `role_name`
- `status`
- `created_at`
- `updated_at`

索引建议：

- `uk_roles_role_key`

### `permissions`

字段建议：

- `id`
- `permission_key`
- `permission_name`
- `permission_type`
- `created_at`
- `updated_at`

索引建议：

- `uk_permissions_permission_key`

### `admin_user_roles`

字段建议：

- `id`
- `admin_user_id`
- `role_id`
- `created_at`

约束建议：

- `uk_admin_user_roles_user_role`

### `role_permissions`

字段建议：

- `id`
- `role_id`
- `permission_id`
- `created_at`

约束建议：

- `uk_role_permissions_role_permission`

### `members`

字段建议：

- `id`
- `member_no`
- `nickname`
- `avatar_url`
- `mobile`
- `status`
- `registered_at`
- `created_at`
- `updated_at`

索引建议：

- `uk_members_member_no`
- `idx_members_mobile`

### `member_wechat_bindings`

字段建议：

- `id`
- `member_id`
- `channel_type`
- `openid`
- `unionid`
- `bound_at`
- `created_at`
- `updated_at`

索引建议：

- `uk_member_wechat_bindings_channel_openid`
- `idx_member_wechat_bindings_unionid`
- `idx_member_wechat_bindings_member_id`

说明：

- `channel_type` 用于区分小程序与公众号
- `unionid` 允许为空，但一旦有值应参与归并逻辑

### `series`

字段建议：

- `id`
- `series_no`
- `name`
- `description`
- `status`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

索引建议：

- `uk_series_series_no`
- `idx_series_status`

### `issuance_batches`

字段建议：

- `id`
- `batch_no`
- `series_id`
- `name`
- `quantity`
- `activate_valid_from`
- `activate_valid_to`
- `status`
- `remark`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

索引建议：

- `uk_issuance_batches_batch_no`
- `idx_issuance_batches_series_id`
- `idx_issuance_batches_status`

### `collections`

字段建议：

- `id`
- `collection_no`
- `series_id`
- `batch_id`
- `status`
- `current_owner_member_id`
- `claimed_at`
- `created_at`
- `updated_at`

索引建议：

- `uk_collections_collection_no`
- `idx_collections_series_id`
- `idx_collections_batch_id`
- `idx_collections_owner_member_id`
- `idx_collections_status`

说明：

- 生成激活码时同步创建 `collections`
- 未领取时 `current_owner_member_id` 为空

### `activation_codes`

字段建议：

- `id`
- `code`
- `batch_id`
- `collection_id`
- `status`
- `issued_channel`
- `issued_at`
- `used_by_member_id`
- `used_at`
- `expired_at`
- `voided_at`
- `created_at`
- `updated_at`

索引建议：

- `uk_activation_codes_code`
- `uk_activation_codes_collection_id`
- `idx_activation_codes_batch_id`
- `idx_activation_codes_status`
- `idx_activation_codes_used_by_member_id`

关键约束：

- 一个激活码只能对应一个藏品
- 一个藏品只能对应一个激活码

## M2 必要表

### `collection_content_versions`

字段建议：

- `id`
- `collection_id`
- `version_no`
- `title`
- `summary`
- `cover_image_url`
- `content_payload`
- `edit_status`
- `publish_status`
- `submitted_at`
- `published_at`
- `created_by_member_id`
- `created_at`
- `updated_at`

索引建议：

- `uk_collection_content_versions_collection_version`
- `idx_collection_content_versions_collection_id`
- `idx_collection_content_versions_edit_status`
- `idx_collection_content_versions_publish_status`

说明：

- `content_payload` 一期可以采用 JSON
- `version_no` 在单藏品内递增

### `collection_content_review_records`

字段建议：

- `id`
- `collection_id`
- `content_version_id`
- `review_stage`
- `review_status`
- `review_source`
- `review_reason`
- `reviewed_by_admin_user_id`
- `reviewed_at`
- `created_at`

索引建议：

- `idx_collection_content_review_records_collection_id`
- `idx_collection_content_review_records_content_version_id`
- `idx_collection_content_review_records_review_status`
- `idx_collection_content_review_records_review_stage`

## M3 预留表

### `collection_comments`

字段建议：

- `id`
- `collection_id`
- `content_version_id`
- `member_id`
- `parent_comment_id`
- `root_comment_id`
- `content`
- `status`
- `published_at`
- `created_at`
- `updated_at`

### `collection_comment_review_records`

字段建议：

- `id`
- `comment_id`
- `review_status`
- `review_source`
- `review_reason`
- `reviewed_by_admin_user_id`
- `reviewed_at`
- `created_at`

## M4 预留表

### `collection_transfer_orders`

字段建议：

- `id`
- `transfer_no`
- `collection_id`
- `from_member_id`
- `to_member_id`
- `transfer_mode`
- `transfer_code`
- `status`
- `expired_at`
- `completed_at`
- `created_at`
- `updated_at`

### `notification_messages`

字段建议：

- `id`
- `member_id`
- `message_type`
- `title`
- `content`
- `read_at`
- `created_at`

### `notification_dispatch_records`

字段建议：

- `id`
- `message_id`
- `channel`
- `status`
- `provider_response`
- `sent_at`
- `created_at`

## 推荐枚举

### 系列状态

- `ENABLED`
- `DISABLED`

### 批次状态

- `ENABLED`
- `DISABLED`

### 激活码状态

- `UNISSUED`
- `ISSUED`
- `USED`
- `VOIDED`
- `EXPIRED`

### 藏品状态

- `PENDING_CLAIM`
- `OWNED`
- `FROZEN`

### 内容编辑状态

- `DRAFT`
- `UNDER_REVIEW`
- `REJECTED`
- `APPROVED`

### 内容发布状态

- `UNPUBLISHED`
- `PUBLISHED`
- `TAKEDOWN`

### 内容审核状态

- `PENDING_MACHINE`
- `MACHINE_APPROVED`
- `MACHINE_REJECTED`
- `PENDING_MANUAL`
- `MANUAL_APPROVED`
- `MANUAL_REJECTED`

### 会员状态

- `ACTIVE`
- `FROZEN`

## M1 关键事务建议

### 生成激活码

一个事务内完成：

- 创建 `collections`
- 创建 `activation_codes`
- 校验批次可用数量

### 激活藏品

一个事务内完成：

- 锁定激活码
- 校验激活码状态与有效期
- 更新激活码为 `USED`
- 更新藏品拥有者与状态
- 初始化空白内容版本

## Prisma 映射建议

- Prisma model 名使用 PascalCase
- 数据表名使用 `@@map("table_name")`
- 字段名在 Prisma 可用 camelCase，数据库层使用 snake_case
- 所有外键关系显式定义 `@relation`

## 当前实现建议

- 先按 M1 表建最小可运行 Schema
- M2 的内容版本与审核记录紧接着补入
- M3、M4 表可先设计不迁移，或用注释预留
