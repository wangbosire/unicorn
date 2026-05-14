# RELIABILITY

本文档作为可靠性主题入口，聚合与测试策略、状态流转、通知审计相关的稳定设计资料。

## 导航

- [后端测试策略](./design-docs/backend-testing-strategy.md)
- [状态机总览](./design-docs/state-machines.md)
- [事件与通知设计](./design-docs/event-and-notification-design.md)

## 当前可靠性关注点

- 核心状态流转必须可测试、可审计、可追溯
- 审核、通知、转让等异步链路需要明确定义失败处理与补偿口径
