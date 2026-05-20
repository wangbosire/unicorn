# DB Schema

## 入口

- [返回生成文档索引](./索引.md)
- [返回生成文档刷新指南](./生成文档刷新指南.md)

## 快速摘要

- 本文档是 `apps/api/prisma/schema.prisma` 的仓库内摘要，不是数据库结构真相源。
- 当前 schema 已覆盖后台 RBAC、权限组与菜单、会员、发行、藏品、评论、通知、转让和审计留痕。
- 鉴权与菜单扩展已进入 Prisma 真相源，不再停留在文档草案阶段。

## 真相源

- Prisma schema：`apps/api/prisma/schema.prisma`
- 相关设计入口：[设计文档索引](../design-docs/索引.md)

## AI 阅读建议

- 想知道“当前库里有没有这个业务域”：先看“模型覆盖”。
- 想知道“有哪些状态枚举需要对齐”：先看“枚举总览”。
- 想看字段级真相时，不要依赖本文，直接打开 Prisma schema。

## 当前技术口径

- 数据库 provider：`mysql`
- 编码口径：`utf8mb4`
- 维护粒度：只保留枚举、实体和覆盖判断，不复制字段树

## 枚举总览

- `AdminUserStatus`
- `RoleStatus`
- `PermissionType`
- `PermissionStatus`
- `PermissionGroupType`
- `PermissionGroupStatus`
- `MenuType`
- `MenuStatus`
- `AuthorizationChangeTargetType`
- `AuthorizationChangeType`
- `MemberStatus`
- `WechatChannelType`
- `SeriesStatus`
- `IssuanceBatchStatus`
- `ActivationCodeStatus`
- `CollectionStatus`
- `CollectionContentEditStatus`
- `CollectionContentPublishStatus`
- `CollectionContentReviewStage`
- `CollectionContentReviewStatus`
- `CollectionContentReviewSource`
- `CollectionCommentStatus`
- `CollectionCommentReviewSource`
- `NotificationMessageType`
- `NotificationChannel`
- `NotificationDispatchStatus`
- `NotificationTemplateStatus`
- `CollectionTransferMode`
- `CollectionTransferStatus`
- `CollectionTransferOperationType`

## 模型覆盖

### 已覆盖

- 平台与治理：`HealthcheckSeed`、`AdminUser`、`Role`、`Permission`、`PermissionGroup`、`PermissionGroupItem`、`AdminUserRole`、`RolePermission`、`Menu`、`MenuPermissionGroup`、`AuthorizationChangeLog`
- 会员体系：`Member`、`MemberWechatBinding`
- 发行体系：`Series`、`IssuanceBatch`、`ActivationCode`
- 藏品与内容：`Collection`、`CollectionContentVersion`、`CollectionContentReviewRecord`
- 评论治理：`CollectionComment`、`CollectionCommentReviewRecord`
- 转让体系：`CollectionTransferOrder`、`CollectionTransferOperationRecord`
- 通知体系：`NotificationMessage`、`NotificationTemplate`、`NotificationTemplateVersion`、`NotificationTemplateChannel`、`NotificationDispatchRecord`

### 暂未覆盖

- 无。当前一期与二期准备阶段涉及的核心业务域已进入 Prisma schema。

## 刷新方法

最小人工刷新步骤：

1. 确认 `apps/api/prisma/schema.prisma` 已是最新版本。
2. 用 `rg '^(enum|model) ' apps/api/prisma/schema.prisma` 快速列出当前枚举与模型。
3. 只更新本文的“枚举总览”“模型覆盖”“暂未覆盖”，不要复制完整字段树。
4. 若新增业务域，顺手更新 [生成文档刷新指南.md](./生成文档刷新指南.md) 的说明。

## 维护规则

- 本文不做字段字典，也不替代 ER 图。
- 当 schema 变化频率继续升高时，应优先补脚本生成，而不是继续手工扩写。
