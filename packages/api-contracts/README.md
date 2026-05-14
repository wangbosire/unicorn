# API Contracts

`@unicorn/api-contracts` 用于承载前后端共享的接口契约类型。

## 注释要求

- 所有导出类型默认要求带 JSDoc
- 业务关键字段默认要求补字段说明
- 写法遵循项目规范：
  [代码注释与字段说明规范](../../docs/design-docs/code-comment-standard.md)

## 包职责

适合放在这里的内容：

- 请求 DTO 类型
- 响应 DTO 类型
- Query / Params 类型
- 通用 API 响应包装类型
- 面向接口返回的视图模型

不放在这里的内容：

- NestJS 运行时代码
- Prisma Model
- 前端页面状态
- 业务实现逻辑

## 推荐目录

```text
packages/api-contracts/
├── src/
│   ├── common/
│   ├── admin/
│   ├── member/
│   ├── public/
│   ├── view-models/
│   └── index.ts
├── package.json
└── README.md
```

## 推荐拆分顺序

1. 先补 `common` 通用响应和分页类型
2. 再补 M1 联调必须接口
3. 再补 M2 内容编辑与审核接口
4. 最后扩展评论、转让、通知相关契约

## 参考文档

- [接口清单草案](/Users/bytedance/Desktop/workspace/repo/unicorn/docs/design-docs/api-endpoint-inventory.md)
- [接口契约草案](/Users/bytedance/Desktop/workspace/repo/unicorn/docs/design-docs/api-contract-draft.md)
- [`api-contracts` 包设计](/Users/bytedance/Desktop/workspace/repo/unicorn/docs/design-docs/api-contracts-package-design.md)
