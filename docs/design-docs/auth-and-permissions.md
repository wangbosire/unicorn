# 数字藏品运营与展示平台鉴权与权限设计

## 文档目标

本文档用于统一后台、会员和公开访问三类身份体系的鉴权边界与权限控制方式。

## 身份体系划分

### 后台用户

面向运营、审核、客服和系统管理员。

特点：

- 独立后台登录入口
- 独立账户表
- 使用 RBAC 控制访问和操作权限

### 会员用户

面向小程序或公众号登录会员。

特点：

- 通过微信授权接入
- 统一归并到会员主账户
- 不使用后台 RBAC
- 通过资源归属和状态校验授权

### 匿名访客

面向公开展示浏览者。

特点：

- 无需登录
- 只能访问公开页面
- 不可查看内部状态和运营数据

## 后台权限模型

后台权限建议分为两层：

- 页面访问权限
- 动作操作权限

典型页面权限：

- `issuance.series.view`
- `issuance.batch.view`
- `issuance.activation-code.view`
- `collection.review.view`
- `comment.review.view`
- `member.view`
- `system.role.view`

典型动作权限：

- `issuance.series.create`
- `issuance.batch.create`
- `issuance.activation-code.generate`
- `collection.review.approve`
- `collection.review.reject`
- `comment.review.approve`
- `member.freeze`
- `member.unfreeze`

## 会员权限模型

会员权限不使用角色树，而使用以下组合判断：

- 是否已登录
- 资源是否归属于当前会员
- 资源当前状态是否允许该动作

典型判断示例：

- 只有当前拥有者可编辑藏品
- 冻结会员不可继续提交评论
- 已下架内容不可继续作为公开页访问
- 转让中或冻结中的藏品不可发起新的转让

## 公开访问控制

公开接口仅返回：

- 已公开的内容
- 对外可展示的评论
- 不含内部审核信息的展示字段

禁止暴露：

- 审核原因
- 风控标签
- 内部操作日志
- 会员隐私信息

## Token 与会话建议

### 后台

- 独立后台 Token
- 后台会话不可复用会员 Token
- 后台操作应记录登录日志和操作日志

### 会员

- 独立会员 Token
- 支持微信授权换取会员会话
- 支持基于 unionid 的账号归并

## 接口层落点

- `admin-api`：强制后台身份和 RBAC
- `member-api`：强制会员身份并校验资源归属
- `public-api`：匿名可访问，仅暴露公开数据

## 一期必须落实的权限规则

- 后台用户与会员不得混用账户体系
- 所有审核动作必须保留操作人
- 所有修改类后台接口必须做动作级鉴权
- 会员侧编辑、评论、转让必须做归属校验
