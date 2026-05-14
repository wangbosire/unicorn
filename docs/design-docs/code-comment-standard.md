# 数字藏品运营与展示平台代码注释与字段说明规范

## 文档目标

本文档用于统一本项目的代码注释、字段说明、类型说明和数据库字段文档写法，作为前端、后端与共享包的通用编码规范。

## 适用范围

- `apps/admin`
- `apps/miniapp`
- `apps/api`
- `packages/*`
- `apps/api/prisma/schema.prisma`

## 总原则

- 代码不是只给机器运行，也要给团队阅读
- 业务字段、状态字段、跨模块契约字段必须有明确说明
- 注释应解释“业务含义和约束”，不重复代码表面意思
- 面向前后端共享的类型定义必须带字段说明
- 新增模型、DTO、响应结构、关键方法默认要求带注释

## 必须写注释的场景

### 1. 共享契约类型

适用：

- `packages/api-contracts`
- `packages/shared-types`

要求：

- 每个导出类型都要有 JSDoc
- 重要字段要有字段级说明
- 字段说明要写清业务含义，而不只是数据类型

### 2. 数据库模型与 Schema

适用：

- Prisma `model`
- Prisma `enum`
- 关键字段

要求：

- 每个 `model` 前写模型说明
- 每个 `enum` 前写状态用途说明
- 编号字段、状态字段、外键字段、审计字段应补字段说明

### 3. 后端 DTO / Service / Policy

适用：

- 请求 DTO
- 响应 DTO
- 复杂 service
- 权限与状态判断逻辑

要求：

- DTO 要解释字段业务约束
- 复杂业务流程前要有块注释说明
- 状态流转判断要说明原因和边界

### 4. 前端页面模型与接口调用层

适用：

- 页面用到的 view model
- 表单数据结构
- 接口适配层

要求：

- 解释页面依赖的业务字段
- 解释展示态与服务端状态的映射
- 不要求给每个简单局部变量写注释

## 不建议写的注释

- 只重复代码字面意思的注释
- 一眼能看懂的简单赋值注释
- 过时但未更新的注释
- 与实际字段含义不一致的注释

## 推荐写法

### TypeScript 类型注释

```ts
/**
 * 会员激活藏品请求。
 * activationCode 为运营发放的唯一激活码，不是藏品编号。
 */
export type ActivateCollectionRequest = {
  /** 会员输入的激活码。 */
  activationCode: string
}
```

### TypeScript 响应结构注释

```ts
/**
 * 藏品内容版本视图。
 * 该结构用于前后端共享当前可编辑版本的数据形态。
 */
export type CollectionContentVersionView = {
  /** 内容版本主键。 */
  id: string
  /** 单藏品内递增的版本号。 */
  versionNo: number
}
```

### Prisma 模型注释

```prisma
/// 藏品主实体。
/// 表示数字资产本体，不等同于可公开展示的内容版本。
model Collection {
  /// 藏品主键。
  id String @id @default(cuid())
  /// 对外展示的藏品编号。
  collectionNo String @unique @map("collection_no")
}
```

## 字段说明最低要求

以下字段类型默认应补充说明：

- 编号字段
  - 如 `seriesNo`、`batchNo`、`collectionNo`
- 状态字段
  - 如 `status`、`editStatus`、`publishStatus`
- 时间字段
  - 如 `claimedAt`、`submittedAt`、`publishedAt`
- 外键字段
  - 如 `seriesId`、`batchId`、`collectionId`
- 业务输入字段
  - 如 `activationCode`、`reason`、`remark`

## 前后端通用要求

### 共享包

- 导出类型必须带 JSDoc
- 重要字段必须写字段说明
- 命名和文档用词保持一致

### 前端

- 组件 props 如承载业务含义，应写 JSDoc
- 页面视图模型如与接口字段不同，应说明映射关系

### 后端

- DTO、Policy、跨模块事件 payload 必须写说明
- 状态机和审核逻辑相关代码必须解释规则来源

## 执行要求

- 新增代码默认遵守本规范
- 修改旧代码时，优先补齐当前改动范围内的注释
- 如注释与实现冲突，以修正注释和实现一致性为先

## 当前项目落地方式

- 文档基线：以本文档为准
- Prisma 字段文档：使用 `///`
- TypeScript 类型文档：使用 JSDoc `/** ... */`
- 共享契约包优先作为示范区域
- 请求校验字段优先复用 `apps/api/src/common/validation/fields.ts`

## 接口与契约补充规范

### 时间字段说明

凡是接口响应中的时间字段，注释中应明确以下信息：

- 返回类型为毫秒时间戳
- 可空时要写明返回 `null` 的含义
- 不要只写“创建时间”或“提交时间”，要写清单位

推荐示例：

```ts
/** 审核完成时间戳，单位毫秒。 */
reviewedAt: number

/** 实际领取时间戳，单位毫秒；未领取时为 null。 */
claimedAt: number | null
```

### JSON 载荷字段说明

凡是 `Record<string, unknown>`、`unknown`、`JsonValue` 这类结构化载荷字段，注释要解释：

- 承载的业务对象是什么
- 是否为前后端共享结构
- 当前阶段是否允许自由扩展

推荐示例：

```ts
/** 结构化内容载荷，一期按前后端共享 JSON 结构承载。 */
contentPayload: Record<string, unknown>
```

### 状态字段说明

状态字段注释不应只写“状态”，而应尽量写出状态作用域。

推荐写法：

- `当前藏品资产状态`
- `当前编辑状态`
- `当前公开发布状态`
- `审核后的状态`

### Zod 校验规范

后端新增 schema 时，优先复用通用字段构造器，不重复手写基础规则。

当前推荐复用：

- `requiredTextField`
- `optionalTextField`
- `requiredIdField`
- `positiveIntegerField`
- `optionalRemarkField`
- `nullableTextField`

示例：

```ts
const createSeriesSchema = z.object({
  name: requiredTextField('series name'),
  description: requiredTextField('series description'),
})
```

### 响应壳说明

成功响应和失败响应相关类型，应补充固定字段语义：

- `code` 是否固定值或业务错误码
- `message` 的用途
- `details` 的用途
- `data` 的职责边界

## 测试文件补充规范

后端测试文件建议与源码目录保持镜像关系，便于按模块快速查找。

推荐示例：

- `src/modules/issuance/series/series.service.ts`
- `test/modules/issuance/series/series.service.test.ts`

- `src/common/http/api-exception.filter.ts`
- `test/common/http/api-exception.filter.test.ts`

当新增 controller / service / 公共层代码时，优先在对应镜像目录补充测试文件。
