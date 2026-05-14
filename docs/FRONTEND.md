# FRONTEND

本文档作为前端研发入口，统一指向后台端与小程序端当前应遵循的产品和设计资料。

## 重点入口

- [产品规格索引](./product-specs/index.md)
- [设计文档索引](./design-docs/index.md)
- [架构总览](../ARCHITECTURE.md)

## 当前前端关注点

- 后台管理端按业务域推进页面与操作流闭环
- 小程序端按“激活、我的藏品、展示、消息、转让”任务流推进
- 复杂状态与权限规则以后端与共享契约为准，避免前端自行扩散规则

## 后台 Feature 结构约定

- 后台端新增业务域时，默认参考 `apps/admin/src/features/tasks/` 的目录组织方式
- 页面入口文件保留在 feature 根目录，例如 `series-page.tsx`、`batches-page.tsx`
- 通用表格列定义、表格装配、行操作、弹窗等拆分文件优先放入同级 `components/`
- mock 数据、映射常量、schema 等辅助文件优先放入同级 `data/`
- 如果某个 feature 需要偏离该结构，应先在文档中说明原因，避免页面文件、表格文件、动作文件散落在根目录

## API 目录约定

- 前端接口调用层统一放入各端自己的 `src/apis/` 目录，不再散落在 feature 目录或 `lib/` 目录
- 后台端接口按业务域划分，例如 `apps/admin/src/apis/issuance/series.ts`
- 小程序端接口按用户侧领域划分，例如 `apps/miniapp/src/apis/member/member-api.ts`
- feature 页面、组件、弹窗只引用 `src/apis/` 中的接口封装，不直接在 feature 目录下新建 `*-api.ts`
- 如果接口封装同时承担会话注入、错误壳解包或端侧上下文拼装，也仍然优先放在 `src/apis/` 下，而不是放入通用 `lib/`

## 测试文件约定

- 前端工程测试文件规范与后端保持一致，统一采用 `src/` 与 `test/` 镜像目录，而不是默认把测试文件放在源码同级
- `apps/admin` 中，源码放在 `apps/admin/src/...`，对应测试放在 `apps/admin/test/...`（已全部收敛到镜像目录，勿再在 `src/` 下放 `*.test.*`）
- `apps/miniapp` 中，源码放在 `apps/miniapp/src/...`，对应测试放在 `apps/miniapp/test/...`
- 镜像规则按相对路径保持一致，便于快速定位实现与测试的对应关系
- Vitest 在 `apps/admin/vite.config.ts` 中通过 `test.include` 仅收集 `test/**/*` 下的用例，避免误跑 `src/` 下的历史路径

推荐示例：

- `apps/admin/src/features/issuance/components/create-series-dialog.tsx`
- `apps/admin/test/features/issuance/components/create-series-dialog.test.tsx`

- `apps/miniapp/src/pages/activate/index.tsx`
- `apps/miniapp/test/pages/activate/index.test.tsx`
