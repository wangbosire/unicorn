/**
 * 重投通知派发记录返回结构。
 */
export type RetryNotificationDispatchResponseData = {
  /** 原派发记录主键。 */
  dispatchRecordId: string
  /** 重新入队的消息主键。 */
  messageId: string
  /** 重新派发的渠道。 */
  channel: 'IN_APP' | 'MINIAPP_SUBSCRIPTION' | 'WECHAT_MP'
  /** 队列任务名。 */
  jobName: string
}
