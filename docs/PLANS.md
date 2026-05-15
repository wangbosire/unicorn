# PLANS

`docs/exec-plans/` 用于沉淀实施节奏、当前排期、已完成计划与技术债跟踪。

## 导航

- [进行中计划](./exec-plans/active)
- [已完成计划](./exec-plans/completed)
- [M1 验收清单（已归档）](./exec-plans/completed/m1-acceptance-checklist.md)
- [M2 验收清单（进行中）](./exec-plans/active/m2-acceptance-checklist.md)
- [M3 验收清单（草案）](./exec-plans/active/m3-acceptance-checklist.md)
- [里程碑总览](./exec-plans/active/milestones-overview.md)
- [模块拆分建议](./exec-plans/active/module-splitting-plan.md)
- [技术债跟踪](./exec-plans/tech-debt-tracker.md)
- [参考资料索引](./references/index.md)

## 执行计划规则

- 复杂或跨模块工作必须先沉淀为 `exec-plans/active/` 下的执行计划，再进入实现
- 执行计划应是版本化工件，而不是聊天中的临时说明
- 计划完成后应迁移到 `exec-plans/completed/`，并保留关键结论与复盘
- 无法立即处理但已识别的结构性问题，应进入 `tech-debt-tracker.md`

## 推荐计划模板

每份执行计划至少应包含以下字段：

- 文档目标：说明这份计划解决什么问题
- 当前状态：`draft`、`active`、`blocked`、`completed`
- 目标结果：完成后可被验证的结果
- 范围内事项：本计划明确覆盖什么
- 范围外事项：本计划明确不做什么
- 依赖关系：前置条件、跨模块依赖、阻塞项
- 里程碑：阶段切分、推荐顺序、每阶段交付物
- 验收标准：什么情况下视为完成
- 决策日志：关键取舍、变更原因、日期
- 风险与对策：已知不确定性与应对方案

## 当前重点

- 以一期核心业务主链路闭环为最高优先级
- 先稳定里程碑、依赖关系与验收口径，再扩展次要能力
