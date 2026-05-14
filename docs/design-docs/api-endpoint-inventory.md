# 数字藏品运营与展示平台接口清单草案

## 文档目标

本文档用于按 `admin-api / member-api / public-api` 统一整理一期接口清单，方便前后端并行开发、联调和验收拆分。

## 使用原则

- 先覆盖 M1、M2 主链路
- 接口名优先表达业务动作，而不是页面结构
- 藏品主链路相关接口保持 `collection` 命名族一致
- 本文档先定义接口边界，不在此处展开 DTO 细节

## `admin-api`

### 认证与后台身份

- `POST /admin-api/auth/login`
  - 后台账号登录
- `POST /admin-api/auth/logout`
  - 后台账号退出
- `GET /admin-api/auth/me`
  - 获取当前后台用户与权限信息

### 系列管理

- `GET /admin-api/series`
  - 查询系列列表
- `POST /admin-api/series`
  - 创建系列
- `GET /admin-api/series/:seriesId`
  - 查询系列详情
- `PATCH /admin-api/series/:seriesId`
  - 编辑系列
- `PATCH /admin-api/series/:seriesId/status`
  - 启用或停用系列

### 发行批次管理

- `GET /admin-api/issuance-batches`
  - 查询批次列表
- `POST /admin-api/issuance-batches`
  - 创建批次
- `GET /admin-api/issuance-batches/:batchId`
  - 查询批次详情
- `PATCH /admin-api/issuance-batches/:batchId`
  - 编辑批次
- `PATCH /admin-api/issuance-batches/:batchId/status`
  - 启用或停用批次

### 激活码管理

- `GET /admin-api/activation-codes`
  - 查询激活码列表
- `POST /admin-api/activation-codes/generate`
  - 批量生成激活码并同步创建藏品
- `GET /admin-api/activation-codes/:codeId`
  - 查询激活码详情
- `PATCH /admin-api/activation-codes/:codeId/void`
  - 作废未使用激活码

### 藏品管理

- `GET /admin-api/collections`
  - 查询藏品列表
- `GET /admin-api/collections/:collectionId`
  - 查询藏品详情
- `PATCH /admin-api/collections/:collectionId/status`
  - 冻结或恢复藏品

### 内容审核

- `GET /admin-api/collection-reviews`
  - 查询内容审核队列
- `GET /admin-api/collection-reviews/:reviewId`
  - 查询审核记录详情
- `POST /admin-api/collection-reviews/:reviewId/approve`
  - 人工审核通过
- `POST /admin-api/collection-reviews/:reviewId/reject`
  - 人工审核驳回

### 评论审核

- `GET /admin-api/collection-comments`
  - 查询评论列表
- `GET /admin-api/collection-comments/reviews`
  - 查询评论审核队列
- `POST /admin-api/collection-comments/:commentId/approve`
  - 审核通过评论
- `POST /admin-api/collection-comments/:commentId/reject`
  - 审核驳回评论

### 会员管理

- `GET /admin-api/members`
  - 查询会员列表
- `GET /admin-api/members/:memberId`
  - 查询会员详情
- `PATCH /admin-api/members/:memberId/freeze`
  - 冻结会员
- `PATCH /admin-api/members/:memberId/unfreeze`
  - 解冻会员

## `member-api`

### 会员认证

- `POST /member-api/auth/wechat-miniapp`
  - 小程序登录
- `POST /member-api/auth/wechat-mp`
  - 公众号登录
- `GET /member-api/auth/me`
  - 获取当前会员信息

### 激活藏品

- `POST /member-api/collection-activation`
  - 输入激活码并领取藏品

### 我的藏品

- `GET /member-api/my/collections`
  - 查询我的藏品列表
- `GET /member-api/my/collections/:collectionId`
  - 查询我的藏品详情

### 藏品内容编辑

- `GET /member-api/my/collections/:collectionId/content`
  - 查询当前可编辑内容版本
- `POST /member-api/my/collections/:collectionId/content/drafts`
  - 保存草稿
- `POST /member-api/my/collections/:collectionId/content/submissions`
  - 提交审核

### 我的消息

- `GET /member-api/my/messages`
  - 查询站内消息列表
- `PATCH /member-api/my/messages/:messageId/read`
  - 标记已读

### 我的转让

- `GET /member-api/my/transfers`
  - 查询我的转让记录
- `POST /member-api/my/collections/:collectionId/transfers`
  - 发起转让
- `POST /member-api/my/transfers/:transferId/accept`
  - 接收转让

### 评论互动

- `POST /member-api/collection-comments`
  - 发表评论
- `POST /member-api/collection-comments/:commentId/replies`
  - 发表评论回复

## `public-api`

### 公开展示

- `GET /public-api/collections/:slug`
  - 查询公开展示页
- `GET /public-api/collections/:slug/stats`
  - 查询公开展示统计摘要

### 公开评论

- `GET /public-api/collections/:slug/comments`
  - 查询公开评论列表

## M1 必须落地接口

- `POST /admin-api/auth/login`
- `GET /admin-api/series`
- `POST /admin-api/series`
- `GET /admin-api/issuance-batches`
- `POST /admin-api/issuance-batches`
- `GET /admin-api/activation-codes`
- `POST /admin-api/activation-codes/generate`
- `GET /admin-api/collections`
- `POST /member-api/auth/wechat-miniapp`
- `GET /member-api/auth/me`
- `POST /member-api/collection-activation`
- `GET /member-api/my/collections`

## M2 必须落地接口

- `GET /member-api/my/collections/:collectionId/content`
- `POST /member-api/my/collections/:collectionId/content/drafts`
- `POST /member-api/my/collections/:collectionId/content/submissions`
- `GET /admin-api/collection-reviews`
- `POST /admin-api/collection-reviews/:reviewId/approve`
- `POST /admin-api/collection-reviews/:reviewId/reject`
- `GET /public-api/collections/:slug`

## 后续可继续补充

- 每个接口的请求 DTO
- 每个接口的响应 DTO
- 权限点映射
- 错误码映射
- 联调样例
