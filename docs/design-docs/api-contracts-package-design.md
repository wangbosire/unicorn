# 数字藏品运营与展示平台 `api-contracts` 包设计

## 文档目标

本文档用于定义 `packages/api-contracts` 的职责边界、目录结构、文件命名和抽取顺序，作为接口契约从文档落地到代码包的实施说明。

## 包职责

`@unicorn/api-contracts` 只承载前后端共享的接口契约，不承载运行时业务逻辑。

适合放入该包的内容：

- 请求 DTO 类型
- 响应 DTO 类型
- 列表查询参数类型
- 路径参数类型
- 接口返回视图模型
- 通用 API 响应包装类型

不适合放入该包的内容：

- NestJS Controller
- Service 业务逻辑
- Prisma Model
- 前端页面状态
- 纯领域枚举以外的运行时实现

## 与其他共享包的边界

### `@unicorn/api-contracts`

负责：

- 接口输入输出契约
- 面向边界层的返回模型

### `@unicorn/shared-types`

负责：

- 领域状态枚举
- 通用 ID 类型
- 可被多处复用的基础领域类型

### `@unicorn/shared-config`

负责：

- 错误码常量
- 权限 key
- 路由常量
- 事件名

## 目录设计

推荐结构如下：

```text
packages/api-contracts/
├── src/
│   ├── common/
│   │   ├── api-response.ts
│   │   ├── pagination.ts
│   │   ├── path-params.ts
│   │   └── index.ts
│   ├── admin/
│   │   ├── auth/
│   │   ├── series/
│   │   ├── issuance-batches/
│   │   ├── activation-codes/
│   │   ├── collections/
│   │   ├── collection-reviews/
│   │   ├── collection-comments/
│   │   ├── members/
│   │   └── index.ts
│   ├── member/
│   │   ├── auth/
│   │   ├── collection-activation/
│   │   ├── my-collections/
│   │   ├── my-messages/
│   │   ├── my-transfers/
│   │   ├── collection-comments/
│   │   └── index.ts
│   ├── public/
│   │   ├── collections/
│   │   └── index.ts
│   ├── view-models/
│   │   ├── collection-summary.ts
│   │   ├── collection-content.ts
│   │   ├── activation-code.ts
│   │   ├── series.ts
│   │   ├── issuance-batch.ts
│   │   └── index.ts
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

## 文件拆分原则

- 按 API 边界拆分，不按前端页面拆分
- 每个资源目录只放该资源相关的契约
- 输入输出分文件时，优先按动作命名
- 公共视图模型单独沉淀到 `view-models`

## 文件命名建议

### 通用命名

- `*.request.ts`
- `*.response.ts`
- `*.query.ts`
- `*.params.ts`
- `*.vm.ts`

### 示例

- `login.request.ts`
- `login.response.ts`
- `list-series.query.ts`
- `list-series.response.ts`
- `generate-activation-codes.request.ts`
- `generate-activation-codes.response.ts`
- `collection-summary.vm.ts`

## M1 推荐首批文件

### `common`

- `api-response.ts`
- `pagination.ts`

### `admin/auth`

- `login.request.ts`
- `login.response.ts`

### `admin/series`

- `list-series.query.ts`
- `list-series.response.ts`
- `create-series.request.ts`
- `create-series.response.ts`

### `admin/issuance-batches`

- `list-issuance-batches.query.ts`
- `list-issuance-batches.response.ts`
- `create-issuance-batch.request.ts`
- `create-issuance-batch.response.ts`

### `admin/activation-codes`

- `list-activation-codes.query.ts`
- `list-activation-codes.response.ts`
- `generate-activation-codes.request.ts`
- `generate-activation-codes.response.ts`

### `admin/collections`

- `list-collections.query.ts`
- `list-collections.response.ts`

### `member/auth`

- `wechat-miniapp-login.request.ts`
- `wechat-miniapp-login.response.ts`
- `get-current-member.response.ts`

### `member/collection-activation`

- `activate-collection.request.ts`
- `activate-collection.response.ts`

### `member/my-collections`

- `list-my-collections.query.ts`
- `list-my-collections.response.ts`

## M2 推荐增补文件

### `member/my-collections`

- `get-collection-content.params.ts`
- `get-collection-content.response.ts`
- `save-collection-draft.request.ts`
- `save-collection-draft.response.ts`
- `submit-collection-content.request.ts`
- `submit-collection-content.response.ts`

### `admin/collection-reviews`

- `list-collection-reviews.query.ts`
- `list-collection-reviews.response.ts`
- `approve-collection-review.request.ts`
- `approve-collection-review.response.ts`
- `reject-collection-review.request.ts`
- `reject-collection-review.response.ts`

### `public/collections`

- `get-public-collection.params.ts`
- `get-public-collection.response.ts`

## 导出策略

- 每个子目录提供 `index.ts`
- 边界层目录提供聚合 `index.ts`
- 包根目录仅做转发导出

示例：

```ts
export * from './common'
export * from './admin'
export * from './member'
export * from './public'
export * from './view-models'
```

## 与当前文档的对应关系

建议以以下文档为抽取来源：

- [接口清单草案](./api-endpoint-inventory.md)
- [接口契约草案](./api-contract-draft.md)
- [API 约定文档](./api-conventions.md)

## 抽取顺序建议

1. 先抽 `common` 通用响应和分页类型
2. 再抽 M1 必须联调接口
3. 再抽 M2 内容与审核接口
4. 最后补 M3、M4 的评论、转让、通知契约

## 实施注意事项

- 不要把后端内部 Entity 直接当作响应类型导出
- 不要让前端页面表单类型直接反向主导接口契约
- 接口契约变更要同步更新文档和调用方
