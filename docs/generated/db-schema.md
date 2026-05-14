# DB Schema

本文档用于承接数据库结构的仓库内摘要输出，当前依据 `apps/api/prisma/schema.prisma` 整理。

## 当前状态

- 当前仓库已存在 Prisma Schema 作为源码真相源：`apps/api/prisma/schema.prisma`
- 当前数据库 provider 为 `sqlite`
- 本文档当前维护“实体总览 + 枚举总览”，后续可继续补充关系图或字段明细

## 枚举总览

- `AdminUserStatus`：后台用户状态
- `RoleStatus`：角色状态
- `PermissionType`：权限类型
- `MemberStatus`：会员状态
- `WechatChannelType`：微信渠道类型
- `SeriesStatus`：系列状态
- `IssuanceBatchStatus`：发行批次状态
- `ActivationCodeStatus`：激活码状态
- `CollectionStatus`：藏品资产状态
- `CollectionContentEditStatus`：藏品内容编辑状态
- `CollectionContentPublishStatus`：藏品内容公开状态
- `CollectionContentReviewStage`：审核阶段
- `CollectionContentReviewStatus`：审核状态
- `CollectionContentReviewSource`：审核来源

## 实体总览

### 平台与基础治理

- `HealthcheckSeed`：健康检查种子表
- `AdminUser`：后台用户
- `Role`：角色定义
- `Permission`：权限定义
- `AdminUserRole`：后台用户与角色关系
- `RolePermission`：角色与权限关系

### 会员体系

- `Member`：会员主账号
- `MemberWechatBinding`：会员微信绑定关系

### 发行体系

- `Series`：藏品系列
- `IssuanceBatch`：发行批次
- `ActivationCode`：激活码

### 藏品与内容体系

- `Collection`：藏品主实体
- `CollectionContentVersion`：藏品内容版本
- `CollectionContentReviewRecord`：藏品内容审核记录

## 当前模型覆盖判断

- 已覆盖后台 RBAC 基础模型
- 已覆盖会员主账号与微信绑定模型
- 已覆盖系列、批次、激活码、藏品生成与领取闭环
- 已覆盖内容版本与审核记录基础模型
- 评论、转让、通知、审计等扩展域暂未在当前 Schema 中出现

## 建议维护方式

- 由脚本生成或在 Schema 发生显著变更后同步更新
- 保持与设计稿和实际实现的一致性，避免手工维护偏离源码
