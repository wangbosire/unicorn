# 数字藏品运营与展示平台后端测试策略

## 文档目标

本文档用于统一 `apps/api` 的后端测试框架、目录组织、分层职责和新增测试的落点规范，作为后续补充测试和排查问题的统一基线。

## 当前结论

当前后端正式采用以下测试组合：

- 测试框架：`Vitest`
- HTTP 集成测试：`supertest`
- 断言风格：优先使用 Node 原生 `assert`
- 测试目录：`apps/api/test`

## 目录约定

测试目录尽量与 `apps/api/src` 保持镜像结构，便于按源码路径快速定位对应测试。

当前推荐结构：

```text
apps/api/
├── src/
│   ├── common/
│   └── modules/
└── test/
    ├── common/
    │   └── http/
    └── modules/
        ├── admin/
        ├── issuance/
        └── member/
```

示例映射：

- `src/common/http/api-exception.filter.ts`
  - `test/common/http/api-exception.filter.test.ts`
- `src/modules/issuance/series/series.service.ts`
  - `test/modules/issuance/series/series.service.test.ts`
- `src/modules/member/my-collections/my-collections.controller.ts`
  - `test/modules/member/my-collections/my-collections.controller.test.ts`

## 分层策略

### 1. 公共层单元测试

目标：

- 验证响应壳、异常转换、分页、序列化等公共能力

典型对象：

- `ApiResponseInterceptor`
- `ApiExceptionFilter`
- 分页与时间序列化 helper

命名建议：

- `*.test.ts`

### 2. Service 层测试

目标：

- 验证业务规则、状态流转、校验逻辑、时间戳转换和错误码

特点：

- 直接 mock Prisma 或外部依赖
- 不经过 HTTP
- 优先覆盖成功路径和关键失败路径

典型对象：

- `series.service.test.ts`
- `issuance-batches.service.test.ts`
- `my-collections.service.test.ts`

### 3. Controller 层测试

目标：

- 验证 query / params / body / headers 是否正确透传给 service
- 验证 member-api 中 authContext 组装是否正确

特点：

- 不启动完整 HTTP 服务
- 重点验证控制器边界层是否正确拼装 service 入参

### 4. HTTP 集成测试

目标：

- 验证真实路由、全局拦截器、全局异常过滤器和统一响应壳

特点：

- 通过 Nest TestingModule 创建应用实例
- 使用 `supertest` 发起真实 HTTP 请求
- 不要求连接真实数据库
- 优先选取核心接口做样板覆盖

当前样板范围：

- `admin-api/series`
- `admin-api/issuance-batches`
- `admin-api/activation-codes`
- `member-api/auth/me`
- `member-api/my/collections`
- `member-api/collection-activation`

## 当前已落地覆盖点

截至当前阶段，后端测试已覆盖以下重点能力：

- 统一成功响应包装
- 统一 BizError 错误响应
- 分页参数与分页返回结构
- 毫秒时间戳输出
- `zod` 参数校验
- 系列、批次、激活码、会员藏品、审核主链路 service 逻辑
- 核心 controller 参数透传
- 核心 HTTP 路由级响应样板

## 新增测试建议

新增测试时，优先按以下顺序补齐：

1. 先补 service 测试
2. 再补 controller 测试
3. 对关键主链路补 HTTP 集成测试

优先覆盖：

- 成功路径
- 关键失败路径
- 业务错误码
- 状态流转边界
- 时间字段和分页结构

## 编写约定

- 测试文件命名统一使用 `*.test.ts`
- 测试标题要直接表达业务意图
- mock 数据优先写成可读的业务样本，而不是最小匿名对象
- 错误断言优先校验 `BizError.code`
- HTTP 测试优先校验完整响应壳：`code`、`message`、`data/details`

## 当前限制

当前环境中 `Vitest` 运行仍可能受到本机 `rolldown` native binding 问题影响。

这不影响：

- 测试目录结构
- 测试代码组织
- TypeScript 编译校验

如需稳定执行 `vitest`，应优先修复本机依赖环境问题。
