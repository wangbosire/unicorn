# 数字藏品运营与展示平台一期数据模型草案

## 文档目标

本文档用于定义一期核心业务实体、实体关系和建模原则，为 Prisma Schema、数据库迁移、接口 DTO 和状态枚举提供统一基础。

## 建模原则

- 先围绕主链路建模，不为远期能力过度抽象
- 主实体、归属关系、内容版本、审核记录分离建模
- 状态字段与审计字段显式保留，避免隐式推导
- 会员账户与后台账户完全分表隔离
- 所有跨流程关键操作都应具备可追溯记录

## 命名规则

- 藏品主链路相关模型统一使用 `Collection` 前缀
- 藏品内容、藏品评论、藏品审核、藏品转让等模型保持同一命名族
- 非藏品专属的通用模型可不强制使用 `Collection` 前缀

## 核心实体

### 后台身份域

#### `AdminUser`

用于后台登录用户。

核心字段：

- `id`
- `accountNo`
- `username`
- `displayName`
- `passwordHash`
- `status`
- `lastLoginAt`

#### `Role`

用于角色定义。

核心字段：

- `id`
- `roleKey`
- `roleName`
- `status`

#### `Permission`

用于页面权限和动作权限定义。

核心字段：

- `id`
- `permissionKey`
- `permissionName`
- `permissionType`

### 会员域

#### `Member`

会员主账户。

核心字段：

- `id`
- `memberNo`
- `nickname`
- `avatarUrl`
- `mobile`
- `status`
- `registeredAt`

#### `MemberWechatBinding`

会员微信渠道绑定关系。

核心字段：

- `id`
- `memberId`
- `channelType`
- `openid`
- `unionid`
- `boundAt`

### 发行域

#### `Series`

藏品系列定义。

核心字段：

- `id`
- `seriesNo`
- `name`
- `description`
- `status`

#### `IssuanceBatch`

系列下的发行批次。

核心字段：

- `id`
- `batchNo`
- `seriesId`
- `name`
- `quantity`
- `activateValidFrom`
- `activateValidTo`
- `status`

#### `ActivationCode`

用于领取藏品的唯一凭证。

核心字段：

- `id`
- `code`
- `batchId`
- `collectionId`
- `status`
- `issuedChannel`
- `issuedAt`
- `usedByMemberId`
- `usedAt`
- `expiredAt`

### 藏品域

#### `Collection`

数字藏品主实体。

核心字段：

- `id`
- `collectionNo`
- `seriesId`
- `batchId`
- `status`
- `currentOwnerMemberId`
- `claimedAt`

说明：

- 藏品主实体用于表示资产本体
- 当前拥有者直接挂在主实体上，便于高频查询
- 历史归属变更通过转让记录追溯

#### `CollectionContentVersion`

藏品展示内容版本。

核心字段：

- `id`
- `collectionId`
- `versionNo`
- `title`
- `summary`
- `coverImageUrl`
- `contentPayload`
- `editStatus`
- `publishStatus`
- `submittedAt`
- `publishedAt`

#### `CollectionPublicSnapshot`

公开展示聚合快照，可选。

核心字段：

- `id`
- `collectionId`
- `contentVersionId`
- `slug`
- `status`
- `updatedAt`

说明：

- 若一期不单独建表，也应在服务层保留“公开聚合快照”概念
- 该概念用于支撑公开页地址稳定、内容替换和缓存控制

### 审核域

#### `CollectionContentReviewRecord`

内容审核记录。

核心字段：

- `id`
- `collectionId`
- `contentVersionId`
- `reviewStage`
- `reviewStatus`
- `reviewSource`
- `reviewReason`
- `reviewedBy`
- `reviewedAt`

#### `CollectionCommentReviewRecord`

评论审核记录。

核心字段：

- `id`
- `commentId`
- `reviewStatus`
- `reviewSource`
- `reviewReason`
- `reviewedBy`
- `reviewedAt`

### 评论域

#### `CollectionComment`

公开页评论实体。

核心字段：

- `id`
- `collectionId`
- `contentVersionId`
- `memberId`
- `parentCommentId`
- `rootCommentId`
- `content`
- `status`
- `publishedAt`

### 转让域

#### `CollectionTransferOrder`

转让流程实例。

核心字段：

- `id`
- `transferNo`
- `collectionId`
- `fromMemberId`
- `toMemberId`
- `transferMode`
- `transferCode`
- `status`
- `expiredAt`
- `completedAt`

### 通知域

#### `NotificationMessage`

面向会员的通知消息。

核心字段：

- `id`
- `memberId`
- `messageType`
- `title`
- `content`
- `readAt`
- `createdAt`

#### `NotificationDispatchRecord`

发送记录。

核心字段：

- `id`
- `messageId`
- `channel`
- `status`
- `providerResponse`
- `sentAt`

## 核心关系

- `Series` 1:N `IssuanceBatch`
- `IssuanceBatch` 1:N `ActivationCode`
- `IssuanceBatch` 1:N `Collection`
- `ActivationCode` 1:1 `Collection`
- `Member` 1:N `Collection` 当前拥有关系
- `Collection` 1:N `CollectionContentVersion`
- `CollectionContentVersion` 1:N `CollectionContentReviewRecord`
- `Collection` 1:N `CollectionComment`
- `CollectionComment` 1:N `CollectionComment` 二级回复
- `Collection` 1:N `CollectionTransferOrder`
- `Member` 1:N `NotificationMessage`

## 一期必须先确定的枚举

- 系列状态
- 批次状态
- 激活码状态
- 藏品状态
- 内容编辑状态
- 内容发布状态
- 内容审核状态
- 评论状态
- 转让单状态
- 会员状态

## 与实现的对应关系

- 持久化层：`apps/api/prisma/schema.prisma`
- 共享类型：`packages/shared-types`
- 共享配置：`packages/shared-config`
- 接口 DTO：`packages/api-contracts` 或各应用服务内部 DTO
