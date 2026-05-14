# SECURITY

本文档作为安全主题入口，聚合鉴权、权限边界、数据访问约束相关设计资料。

## 导航

- [鉴权与权限设计](./design-docs/auth-and-permissions.md)
- [API 约定文档](./design-docs/api-conventions.md)
- [架构总览](../ARCHITECTURE.md)

## 当前安全关注点

- 后台用户与会员账户体系必须严格隔离
- 公开接口不得泄露审核、风控与内部治理信息
- 权限校验口径应优先沉淀到共享契约与后端实现
