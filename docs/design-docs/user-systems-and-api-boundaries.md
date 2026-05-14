# 双用户体系与 API 边界

本文档将“双用户体系隔离设计”和“API 边界设计”从架构总览中单独抽出，便于鉴权、接口规划和应用边界讨论时快速引用。

## 设计目标

单体服务内同时支持：

- 后台管理用户体系
- C 端会员用户体系

两套体系必须在数据、登录态、权限模型、接口边界层面彻底隔离。

## 隔离原则

### 数据隔离

- 后台用户与会员用户使用独立表模型。
- 后台用户表不承载会员身份信息。
- 会员用户表不承载后台角色菜单信息。

### 认证隔离

- 后台与会员使用独立登录入口。
- 后台与会员使用独立 token 策略。
- 后台 token 不可用于会员接口。
- 会员 token 不可用于后台接口。

### 权限隔离

- 后台用户走 RBAC。
- 会员用户不走后台 RBAC。
- 会员用户权限通过“是否登录 + 是否为资源拥有者 + 资源状态是否允许操作”判断。

### 接口隔离

- 后台接口使用 `admin-api`
- 会员接口使用 `member-api`
- 公开接口使用 `public-api`

## API 边界

### admin-api

面向后台管理端。

特点：

- 必须登录后台账号
- 走 RBAC
- 可访问发行、审核、会员管理、系统管理能力

示例：

- `/admin-api/auth/login`
- `/admin-api/series`
- `/admin-api/batches`
- `/admin-api/activation-codes`
- `/admin-api/collections`
- `/admin-api/collection-reviews`
- `/admin-api/collection-comments`
- `/admin-api/members`

### member-api

面向登录会员。

特点：

- 必须登录会员账号
- 不走 RBAC
- 走资源归属校验

示例：

- `/member-api/auth/wechat-miniapp`
- `/member-api/auth/wechat-mp`
- `/member-api/collection-activation`
- `/member-api/my/collections`
- `/member-api/my/messages`
- `/member-api/my/transfers`
- `/member-api/collection-comments`

### public-api

面向公开访问。

特点：

- 默认不要求登录
- 只读
- 仅返回已公开且可见内容

示例：

- `/public-api/collections/:slug`
- `/public-api/collections/:slug/comments`
- `/public-api/collections/:slug/stats`

## 关联文档

- [架构总览](./architecture-overview.md)
- [鉴权与权限设计](./auth-and-permissions.md)
- [用户角色与权限视角](../product-specs/user-roles-and-personas.md)
