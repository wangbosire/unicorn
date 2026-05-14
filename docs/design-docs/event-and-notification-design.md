# 数字藏品运营与展示平台审核与通知事件设计

## 文档目标

本文档用于定义一期需要收口的关键业务事件，以及这些事件如何驱动审核、通知和审计能力协同。

## 设计原则

- 主业务流程由应用服务明确编排
- 跨模块副作用优先通过事件解耦
- 事件命名表达“已发生的业务事实”
- 通知、日志、审计不反向耦合主流程

## 一期关键事件

### 发行与激活

- `issuance.activation_code.generated`
- `collection.created_for_activation`
- `member.collection.activated`

主要副作用：

- 记录审计日志
- 生成激活成功通知

### 内容编辑与审核

- `collection.content.draft_saved`
- `collection.content.submitted`
- `collection.content.machine_approved`
- `collection.content.machine_rejected`
- `collection.content.manual_review_requested`
- `collection.content.manual_approved`
- `collection.content.manual_rejected`
- `collection.content.published`
- `collection.content.taken_down`

主要副作用：

- 驱动机审任务
- 写入审核记录
- 更新公开页
- 发送审核结果通知

### 评论审核

- `comment.submitted`
- `comment.machine_approved`
- `comment.machine_rejected`
- `comment.manual_review_requested`
- `comment.manual_approved`
- `comment.manual_rejected`
- `comment.blocked`

主要副作用：

- 写入评论审核记录
- 触发必要的会员通知

### 转让

- `transfer.created`
- `transfer.accepted`
- `transfer.completed`
- `transfer.cancelled`
- `transfer.expired`

主要副作用：

- 更新藏品归属
- 写入转让记录
- 发送转让结果通知

## 通知设计

### 一期通知类型

- 激活成功通知
- 内容审核通过通知
- 内容审核驳回通知
- 评论审核结果通知
- 转让待接收通知
- 转让完成通知

### 通知渠道

- 站内信：默认必达
- 小程序订阅消息：按用户授权和模板情况发送
- 公众号通知：按绑定情况发送

### 发送策略

- 主流程先保证核心业务提交成功
- 通知发送作为后置副作用处理
- 通知失败不回滚主业务，但需记录状态和错误原因

## 审计与日志

以下动作必须进入审计记录：

- 激活码生成
- 藏品激活
- 内容提交审核
- 人工审核通过/驳回
- 评论审核通过/驳回
- 转让完成

## 一期实现建议

- 一期可先用进程内事件总线
- 事件结构统一包含 `eventName`、`occurredAt`、`operator`、`payload`
- 后续如需要异步重试，再演进到消息队列
