# 数字藏品运营与展示平台 API 约定文档

## 文档目标

本文档用于统一一期接口边界、命名方式、返回结构、错误处理、时间字段约定和版本策略。

## API 分层

### `admin-api`

面向后台管理端。

特点：

- 需要后台身份认证
- 需要页面级或动作级权限
- 返回后台管理视角数据

### `member-api`

面向会员端。

特点：

- 需要会员身份认证
- 需要资源归属校验
- 返回当前会员可见数据

### `public-api`

面向公开浏览。

特点：

- 默认匿名可访问
- 仅返回公开展示数据

## 路径命名约定

- 使用复数资源名
- 使用短横线分隔
- 避免在路径中体现实现细节

示例：

- `/admin-api/series`
- `/admin-api/issuance-batches`
- `/admin-api/activation-codes`
- `/member-api/collections`
- `/member-api/collection-activation`
- `/public-api/collections/:slug`

## 返回结构约定

当前 `apps/api` 已通过全局拦截器与异常过滤器统一响应格式：

- 成功响应由 `ApiResponseInterceptor` 统一包装
- 失败响应由 `ApiExceptionFilter` 统一收口
- Controller 只返回纯业务数据，不手写响应壳
- 业务失败优先通过 `BizError` 抛出

### 成功响应

```json
{
  "code": "OK",
  "message": "success",
  "data": {}
}
```

### 列表响应

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [],
    "page": 1,
    "pageSize": 20,
    "total": 0
  }
}
```

### 失败响应

```json
{
  "code": "ACTIVATION_CODE_EXPIRED",
  "message": "activation code expired",
  "details": {}
}
```

### 返回结构规则

- 成功响应固定返回 `code: "OK"`
- 成功响应固定返回 `message: "success"`
- 失败响应不再包裹 `data`
- 前端应优先基于 `code` 做程序化分支处理
- `message` 用于日志、调试或兜底提示，不应作为唯一 UI 文案来源
- `details` 用于补充字段级校验结果等结构化上下文

## 时间字段约定

当前项目后端统一返回毫秒时间戳，避免前后端分别处理不同时区字符串格式。

规则：

- 所有响应中的时间字段统一返回 `number`
- 时间戳单位统一为毫秒
- 可空时间字段返回 `number | null`
- 时间入参暂使用可被后端解析的时间字符串
- 前端展示层自行决定格式化方式，推荐统一使用 `dayjs`

典型字段：

- `createdAt`
- `updatedAt`
- `claimedAt`
- `submittedAt`
- `reviewedAt`
- `activateValidFrom`
- `activateValidTo`
- `expiredAt`

## 错误码约定

- 业务错误码使用大写下划线风格
- 错误码表达可程序处理的业务语义
- `message` 面向通用调试，不作为最终 UI 文案唯一来源
- 字段校验失败统一使用 `VALIDATION_ERROR`
- 资源不存在时优先使用显式业务码，其次使用 `RESOURCE_NOT_FOUND`

建议首批错误码：

- `UNAUTHORIZED`
- `FORBIDDEN`
- `RESOURCE_NOT_FOUND`
- `VALIDATION_ERROR`
- `ACTIVATION_CODE_INVALID`
- `ACTIVATION_CODE_USED`
- `ACTIVATION_CODE_EXPIRED`
- `COLLECTION_NOT_EDITABLE`
- `COLLECTION_NOT_TRANSFERABLE`
- `REVIEW_STATUS_INVALID`

## 版本策略

- 一期默认不在路径中引入 `v1`
- 当出现不兼容变更时，再引入明确版本前缀或 Header 版本协商
- 在共享契约包中统一维护 DTO 和枚举

## 分页与筛选约定

- 列表接口统一支持 `page`、`pageSize`
- `page` 从 `1` 开始
- 默认分页参数由服务端兜底补齐
- 筛选参数优先使用 query string
- 排序字段统一使用 `sortBy` 和 `sortOrder`
- 分页返回统一使用 `items/page/pageSize/total`

## 请求校验约定

当前项目后端优先使用 `zod` 做请求解析和校验，并统一转换为 `BizError`。

规则：

- Controller / Service 边界处的请求数据统一经 schema 校验
- 校验失败统一转换为 `VALIDATION_ERROR`
- 错误详情通过 `details.issues` 返回字段级问题
- 常用字段优先复用公共构造器，避免重复手写校验规则

当前已沉淀的公共能力：

- `requiredTextField`
- `optionalTextField`
- `requiredIdField`
- `positiveIntegerField`
- `optionalRemarkField`
- `nullableTextField`

## 共享契约约定

- `packages/api-contracts` 承载前后端共享请求/响应结构
- 共享契约字段默认要求带 JSDoc 和字段说明
- 时间字段必须注明“毫秒时间戳”
- JSON 载荷字段必须说明其业务语义，而不只写类型
- 分页结构和 API 响应壳统一从 `common` 目录复用

## 审计与幂等性建议

- 激活、转让接收等关键写操作要考虑幂等
- 批量生成激活码应保留批次级追溯能力
- 审核类接口必须记录操作人和操作时间

## 当前实现状态

截至当前阶段，以下约定已经在代码中落地：

- 统一成功响应包装
- 统一业务异常响应
- 分页参数与分页返回结构通用化
- 时间字段统一输出毫秒时间戳
- `zod` 校验与通用字段构造器
- `api-contracts` 共享类型字段说明补齐
- `Vitest` 后端测试框架与 `supertest` HTTP 集成测试样板
- `apps/api/test` 与 `apps/api/src` 基本保持镜像目录结构
