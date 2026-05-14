# 架构总览

## 文档目标

本文档用于沉淀数字藏品运营与展示平台的一期架构设计基线，明确仓库组织方式、技术栈、后端服务边界、双用户体系隔离方案与共享层设计，为后续工程初始化与模块设计提供统一依据。

## 技术基线

### Monorepo

- 仓库形态：Monorepo
- Workspace 管理：`pnpm workspace`
- 任务编排：`Turborepo`

选择理由：

- 后台、C 端小程序、后端 API 需要长期协同演进。
- 状态枚举、接口契约、权限 key、共享配置需要统一维护。
- 文档、代码、脚本、基础设施配置适合在同一仓库内协同管理。

### 前端技术栈

- 后台管理端：React + Vite + shadcn/ui
- 后台 UI 基座：参考 [shadcn-admin](https://github.com/satnaing/shadcn-admin)
- C 端：TaroJS（以微信小程序为主）

设计说明：

- `shadcn-admin` 作为后台 UI 基座与布局参考，不直接视为完整业务脚手架。
- 后台业务页面、权限、路由、数据层按本项目业务模型自行组织。
- C 端以微信小程序为主，公众号授权登录属于会员账户渠道能力，不单独作为主应用形态。

### 后端技术栈

- 服务形态：模块化单体服务
- 框架：NestJS
- ORM：Prisma
- 数据库：关系型数据库（一期推荐 MySQL 或 PostgreSQL，后续单独定型）

设计说明：

- 一期不采用微服务，优先保障主链路快速闭环与业务模型收敛。
- NestJS 用于支撑模块化业务域划分、鉴权分层、事件编排。
- Prisma 作为持久化层工具，不反向主导业务域边界设计。

## 仓库结构设计

推荐目录结构如下：

```text
unicorn/
├── apps/
│   ├── admin/
│   ├── miniapp/
│   └── api/
├── packages/
│   ├── api-contracts/
│   ├── shared-types/
│   ├── shared-config/
│   ├── ui/
│   ├── utils/
│   ├── eslint-config/
│   └── tsconfig/
├── docs/
│   ├── product-specs/
│   ├── design-docs/
│   ├── exec-plans/
│   ├── references/
│   └── generated/
├── scripts/
├── infra/
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

### apps

- `apps/admin`：后台管理前端
- `apps/miniapp`：微信小程序端
- `apps/api`：NestJS 后端服务

### packages

- `api-contracts`：前后端共享接口契约
- `shared-types`：共享领域类型、状态枚举、DTO 类型
- `shared-config`：共享常量、权限 key、事件名、路由常量
- `ui`：前端共享 UI 组件与基础样式能力
- `utils`：纯工具函数
- `eslint-config`：统一 lint 配置
- `tsconfig`：统一 TypeScript 配置

### docs

- `product-specs`：产品规格文档
- `design-docs`：系统设计与架构文档
- `exec-plans`：执行计划与排期拆分

### scripts

用于存放初始化脚本、数据修复脚本、批量工具脚本、测试数据生成脚本。

### infra

用于存放环境配置、容器配置、部署配置、网关/Nginx 配置与数据库初始化辅助配置。

## 应用层结构设计

### apps/admin

后台前端按业务菜单组织页面目录，建议结构如下：

```text
apps/admin/
├── src/
│   ├── app/
│   ├── pages/
│   │   ├── dashboard/
│   │   ├── issuance/
│   │   ├── collections/
│   │   ├── comments/
│   │   ├── members/
│   │   ├── transfers/
│   │   ├── notifications/
│   │   └── system/
│   ├── components/
│   ├── services/
│   ├── stores/
│   ├── hooks/
│   ├── router/
│   ├── layouts/
│   └── styles/
```

设计原则：

- 页面按业务域组织，不按纯技术层拆散。
- `services` 仅负责接口调用封装。
- 复杂业务规则放在后端，不在前端复制状态流转逻辑。

### apps/miniapp

小程序前端按用户任务流组织页面目录，建议结构如下：

```text
apps/miniapp/
├── src/
│   ├── app/
│   ├── pages/
│   │   ├── auth/
│   │   ├── activate/
│   │   ├── collections/
│   │   ├── public/
│   │   ├── messages/
│   │   ├── comments/
│   │   └── profile/
│   ├── components/
│   ├── services/
│   ├── stores/
│   ├── hooks/
│   ├── utils/
│   └── styles/
```

设计原则：

- 页面按“激活、我的藏品、编辑、公开展示、转让、消息”任务流组织。
- 小程序端承担主要会员业务流程，不承担后台运营逻辑。

### apps/api

后端采用 NestJS 模块化单体结构，建议目录如下：

```text
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── app/
│   │   ├── admin-api/
│   │   ├── member-api/
│   │   └── public-api/
│   ├── modules/
│   │   ├── iam/
│   │   ├── member/
│   │   ├── issuance/
│   │   ├── collection/
│   │   ├── collection-review/
│   │   ├── collection-comment/
│   │   ├── collection-transfer/
│   │   ├── notification/
│   │   └── audit/
│   └── platform/
│       ├── prisma/
│       ├── auth/
│       ├── wechat/
│       ├── moderation/
│       ├── messaging/
│       ├── storage/
│       └── events/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── test/
```

## 后端业务域划分

### iam

职责：

- 后台用户
- 角色
- 菜单
- RBAC 权限模型

### member

职责：

- 会员主账号
- 微信小程序授权绑定
- 微信公众号授权绑定
- unionid 归并
- 会员状态
- 站内消息读取入口

### issuance

职责：

- 系列
- 发行批次
- 激活码
- 激活码发放记录

### collection

职责：

- 藏品主实体
- 藏品内容版本
- 公开展示页聚合
- 浏览统计

### collection-review

职责：

- 内容机审
- 人工复核
- 审核记录
- 审核状态机

### collection-comment

职责：

- 评论
- 二级回复
- 评论审核

### collection-transfer

职责：

- 转让单
- 转让码
- 接收流程
- 转让记录

### notification

职责：

- 站内信
- 站外通知
- 模板
- 投递记录

### audit

职责：

- 登录日志
- 操作日志

## 双用户体系隔离设计

本节详细设计已整理到专题文档：

- [双用户体系与 API 边界](./user-systems-and-api-boundaries.md)

摘要：

- 单体服务内同时支持后台用户体系与 C 端会员体系
- 两套体系必须在数据、认证、权限与接口边界层彻底隔离
- 后台走 RBAC，会员走资源归属与状态判断

## API 边界设计

本节详细设计已整理到专题文档：

- [双用户体系与 API 边界](./user-systems-and-api-boundaries.md)

摘要：

- `admin-api` 面向后台管理端，要求后台登录并执行 RBAC
- `member-api` 面向登录会员，执行资源归属与状态校验
- `public-api` 面向公开访问，只返回已公开且可见内容

## 应用边界与业务域的关系

同一个业务域可同时服务于多个访问边界，但边界层控制器、鉴权方式、返回结构必须分离。

以 `collection` 业务族为例：

- `admin-api`：查看全部藏品、冻结藏品、查看审核记录
- `member-api`：查看我的藏品、编辑我的内容、提交审核、发起转让
- `public-api`：查看公开展示页、公开评论列表、浏览统计

设计原则：

- 共享业务域服务
- 分离应用入口
- 分离鉴权逻辑
- 分离返回模型

## NestJS 模块组织建议

每个业务模块建议按统一方式组织，推荐结构如下：

```text
modules/<domain>/
├── controllers/
│   ├── admin/
│   ├── member/
│   └── public/
├── services/
├── repositories/
├── dto/
├── entities/
├── policies/
├── events/
├── <domain>.module.ts
└── index.ts
```

说明：

- `controllers` 按入口边界进一步拆分
- `services` 负责业务用例
- `repositories` 负责 Prisma 访问封装
- `policies` 负责归属与状态规则判断
- `events` 负责审核、通知、日志等事件协同

## Prisma 使用原则

### 使用方式

- 一期采用单一 Prisma schema
- 所有表由同一个 NestJS API 服务统一管理
- Prisma 通过 `platform/prisma` 对外提供基础能力

### 设计原则

- Prisma 仅作为持久化工具层
- 业务模块通过 repository 访问 Prisma
- 不在 service 中大量直接书写 Prisma 查询
- 表命名按业务域前缀组织

### 推荐表命名风格

```text
iam_admin_user
iam_role
iam_menu

member_user
member_auth_binding
member_message

issuance_series
issuance_batch
issuance_activation_code
issuance_activation_issue_record

collection_item
collection_content_version
collection_view_stat
collection_content_review_record
collection_comment
collection_comment_review_record
collection_transfer_order

notification_template
notification_delivery

audit_login_log
audit_operation_log
```

## 共享层设计

本节详细设计已整理到专题文档：

- [共享层设计](./shared-layer-design.md)

摘要：

- `api-contracts` 承接前后端接口契约
- `shared-types` 承接状态枚举、DTO 类型与通用响应模型
- `shared-config` 承接权限 key、事件名与通用常量
- `ui` 与 `utils` 分别承接可复用界面基础能力与纯工具逻辑

## 鉴权与权限设计原则

### 后台

- 使用后台专属认证链路
- 使用 RBAC
- 权限拆分为页面访问权限与动作权限

### 会员

- 使用会员专属认证链路
- 不接入后台 RBAC
- 使用资源归属与状态校验

### 公开访问

- 默认匿名可访问
- 仅访问公开内容
- 不暴露内部审核与风控状态

## 事件化协同建议

为了降低审核、通知、日志、转让等模块的耦合度，建议一期采用轻量事件化协同：

- 激活成功 -> 触发通知、审计记录
- 内容提交审核 -> 触发机审流程
- 人工驳回 -> 触发审核记录、通知、下架处理
- 转让完成 -> 触发通知、审计记录

设计原则：

- 业务主流程由应用服务编排
- 跨模块副作用优先通过事件处理
- 避免模块间出现大量双向直接调用

## 当前落地原则

- 采用 Monorepo 管理全部应用、共享包与文档
- 一期采用模块化单体后端，不拆微服务
- 后台用户与会员用户严格隔离
- 后台走 RBAC，会员走资源归属判断
- API 边界固定为 `admin-api / member-api / public-api`
- Prisma 作为持久化层，不作为业务边界划分依据
- `shadcn-admin` 作为后台 UI 基座，不作为完整业务模板直接照搬
- 小程序端以 TaroJS 为主形态推进

## 后续设计文档建议

在本架构总览基础上，后续建议继续补充：

- 数据模型设计文档
- 状态机设计文档
- 鉴权与权限设计文档
- 审核与通知事件设计文档
- API 约定文档
