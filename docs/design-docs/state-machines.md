# 数字藏品运营与展示平台一期状态机总览

## 文档目标

本文档用于统一一期核心状态定义，避免前后端、审核链路和统计口径出现分歧。

## 设计原则

- 资产状态、内容状态、审核状态必须分离
- 状态切换只能由明确业务动作触发
- 审核结果必须可追溯，不以最终展示状态反推
- 公开可见性由发布状态控制，不由审核状态直接替代

## 激活码状态

- `UNISSUED`：未发放
- `ISSUED`：已发放
- `USED`：已使用
- `VOIDED`：已作废
- `EXPIRED`：已失效

允许流转：

- `UNISSUED -> ISSUED`
- `UNISSUED -> VOIDED`
- `UNISSUED -> EXPIRED`
- `ISSUED -> USED`
- `ISSUED -> VOIDED`
- `ISSUED -> EXPIRED`

## 藏品状态

- `PENDING_CLAIM`：待领取
- `OWNED`：已领取
- `FROZEN`：冻结

允许流转：

- `PENDING_CLAIM -> OWNED`
- `OWNED -> FROZEN`
- `FROZEN -> OWNED`

## 藏品内容编辑状态

- `DRAFT`：草稿
- `UNDER_REVIEW`：审核中
- `REJECTED`：审核驳回
- `APPROVED`：审核通过

说明：

- 编辑状态反映当前编辑版本的处理进展
- 它不等同于公开页是否可见

## 藏品内容发布状态

- `UNPUBLISHED`：未公开
- `PUBLISHED`：已公开
- `TAKEDOWN`：已下架

允许流转：

- `UNPUBLISHED -> PUBLISHED`
- `PUBLISHED -> TAKEDOWN`
- `TAKEDOWN -> PUBLISHED`

## 内容审核状态

- `PENDING_MACHINE`：待机审
- `MACHINE_APPROVED`：机审通过
- `MACHINE_REJECTED`：机审失败
- `PENDING_MANUAL`：待人工复核
- `MANUAL_APPROVED`：人工通过
- `MANUAL_REJECTED`：人工驳回

关键规则：

- 机审通过可直接进入公开
- 机审失败不得公开
- 机审疑似异常应进入人工复核
- 人工驳回会触发内容下架或阻止公开

## 评论状态

- `PENDING_MACHINE`：待机审
- `MACHINE_APPROVED`：机审通过
- `MACHINE_REJECTED`：机审失败
- `PENDING_MANUAL`：待人工审核
- `MANUAL_APPROVED`：人工通过
- `MANUAL_REJECTED`：人工驳回
- `BLOCKED`：已屏蔽

## 转让单状态

- `PENDING_ACCEPT`：待接收
- `COMPLETED`：已完成
- `CANCELLED`：已取消
- `EXPIRED`：已失效

允许流转：

- `PENDING_ACCEPT -> COMPLETED`
- `PENDING_ACCEPT -> CANCELLED`
- `PENDING_ACCEPT -> EXPIRED`

## 会员状态

- `ACTIVE`：正常
- `FROZEN`：冻结

## 状态协同约束

- 激活码 `USED` 时，对应藏品必须已进入 `OWNED`
- 会员被冻结时，不自动改变藏品公开状态
- 内容审核状态和发布状态必须分别存储
- 新内容版本审核中时，旧公开版本可继续在线
- 转让完成后，藏品当前拥有者变更，但公开页地址保持不变
