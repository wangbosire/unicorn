# 仓库导航

本仓库采用 Harness Engineering 工作方式组织。

## 参考链接

- Harness Engineering: [OpenAI 原文](https://openai.com/zh-Hans-CN/index/harness-engineering/)

## 入口原则

- 本文件保持简短，仅作为导航入口
- 详细知识沉淀在 `docs/` 中
- 计划、规范、设计、参考资料均纳入版本管理

## AI 友好文档原则

- 文档默认面向“上下文有限的人和 AI”编写，先给结论，再给细节
- 单篇文档尽量只回答一类问题，避免把背景、规则、实现细节混写在一起
- 索引文档只保留导航、适用场景和最少必要说明，不复制正文内容
- 能用短列表说清的内容，不展开成长段；能引用既有专题的，不重复解释
- 长文优先拆为稳定专题，并在入口处明确“先看什么、遇到什么问题看哪里”

## 文档命名规范

- 目录入口文件使用稳定短名，如 `索引.md`、`设计.md`、`执行计划.md`
- 专题文档优先使用语义清晰、可长期复用的短名，避免重复携带项目全名
- 当前仓库默认只保留一份进行中计划和一份已归档总览；只有在新阶段真实启动后，才继续拆新的执行计划文档
- 已拆分出的高频专题，应在总览文档中保留摘要并将详细内容收敛到专题文档

## 查阅路径

- 涉及需求范围、业务目标、用户流程时，优先查看 `docs/产品理解.md` 与 `docs/product-specs/`
- 涉及架构、模型、状态、接口、权限时，优先查看 `docs/设计.md` 与 `docs/design-docs/`
- 涉及开发顺序、阶段目标、里程碑、验收标准时，优先查看 `docs/执行计划.md`、`docs/exec-plans/active/二期-通知与转让运营增强.md` 与 `docs/exec-plans/completed/一期V1归档总览.md`
- 涉及质量、可靠性、安全要求时，分别查看 `docs/质量评分.md`、`docs/可靠性.md`、`docs/安全.md`
- 涉及外部资料、生成结果或工具参考时，查看 `docs/references/` 与 `docs/generated/`

## 文档导航

- [docs/索引.md](./docs/索引.md) `docs/` 总索引。
- [架构总览.md](./架构总览.md) 顶层架构入口。
- [docs/产品理解.md](./docs/产品理解.md) 产品理解入口。
- [docs/设计.md](./docs/设计.md) 设计文档入口。
- [docs/前端研发.md](./docs/前端研发.md) 前端研发入口。
- [docs/执行计划.md](./docs/执行计划.md) 执行计划入口。
- [docs/exec-plans/active/二期-通知与转让运营增强.md](./docs/exec-plans/active/二期-通知与转让运营增强.md) 当前进行中计划。
- [docs/exec-plans/completed/一期V1归档总览.md](./docs/exec-plans/completed/一期V1归档总览.md) 已归档一期总览。
- [docs/质量评分.md](./docs/质量评分.md) 质量治理入口。
- [docs/可靠性.md](./docs/可靠性.md) 可靠性入口。
- [docs/安全.md](./docs/安全.md) 安全入口。
- [docs/generated/索引.md](./docs/generated/索引.md) 生成文档入口。
- [docs/references/索引.md](./docs/references/索引.md) 参考资料入口。

## 当前状态

当前仓库的一期主链路与运营治理能力已完成收口，二期已正式进入“通知编排 + 转让运营增强”的阶段性交付阶段：

- `apps/admin`：已接入仪表盘、通知、转让、审核治理、会员治理等一期后台主链路页面
- `apps/miniapp`：已接入登录、激活、我的藏品、内容编辑、公开展示、消息与基础转让链路
- `apps/api`：已形成可支撑 admin-api、member-api、public-api 的一期业务闭环与验收能力
- `docs/`：已沉淀 PRD、架构设计、执行计划、阶段验收与专项归档资料

当前优先级以二期通知派发、模板治理、转让运营闭环的交付收口与环境验证为主，详细内容以 `docs/` 为准。

## 编码规范

- 新增前后端代码默认要求带业务注释与字段说明。
- 共享类型、接口 DTO、Prisma 模型、状态字段必须优先补充说明。
- 统一规范见 [docs/design-docs/engineering/代码注释与字段说明规范.md](./docs/design-docs/engineering/代码注释与字段说明规范.md)。
