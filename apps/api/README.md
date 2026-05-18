# API

NestJS + Prisma 模块化单体服务。

## API 边界

- `admin-api`：后台管理端接口
- `member-api`：会员端接口
- `public-api`：公开展示接口

## 推荐模块划分

- `modules/iam`：后台用户、角色、菜单、权限
- `modules/member`：会员、微信绑定、会员状态
- `modules/issuance`：系列、批次、激活码、发放记录
- `modules/collection`：藏品、归属、内容版本、公开页
- `modules/review`：内容审核、人工复核、审核记录
- `modules/comment`：评论、回复、评论审核
- `modules/transfer`：转让单与转让码
- `modules/notification`：站内信、模板、发送记录
- `modules/audit`：操作日志与业务审计

## 平台能力

- `platform/prisma`：数据库访问
- `platform/auth`：鉴权与令牌
- `platform/wechat`：微信能力接入
- `platform/moderation`：机审能力封装
- `platform/messaging`：通知能力封装
- `platform/storage`：文件与媒体存储
- `platform/events`：领域事件与订阅处理

## 当前状态

- 已完成 NestJS 应用入口和模块装配骨架
- 已接入 Prisma 基础模块
- 已预留三类 API 出口
- 一期核心业务主链路、审核治理、评论治理、后台通知/转让/仪表盘与会员正式鉴权已基本落地
- `member-api` 已接入激活、我的藏品、评论、消息中心与会员转让主链路
