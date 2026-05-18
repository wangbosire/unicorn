/**
 * 后台通知中心汇总项。
 */
export type AdminNotificationOverviewItem = {
  /** 消息类型。 */
  messageType: string
  /** 事件中文名。 */
  eventLabel: string
  /** 最近一条消息标题。 */
  latestTitle: string
  /** 最近一条消息正文摘要。 */
  latestContent: string
  /** 当前类型涉及的触达渠道。 */
  channels: string[]
  /** 最近一条派发状态。 */
  latestDispatchStatus: string | null
  /** 最近一次失败原因或渠道响应摘要。 */
  latestDispatchNote: string | null
  /** 当前类型的消息总数。 */
  totalMessages: number
  /** 当前类型待发送记录数。 */
  pendingDispatches: number
  /** 当前类型失败记录数。 */
  failedDispatches: number
  /** 最近发送成功时间（毫秒时间戳）；从未成功时为 `null`。 */
  lastSentAt: number | null
  /** 最近消息创建时间（毫秒时间戳）。 */
  latestCreatedAt: number
}

/**
 * 后台通知中心总览响应。
 */
export type GetNotificationsOverviewResponseData = {
  /** 消息总数。 */
  totalMessages: number
  /** 未读消息总数。 */
  unreadMessages: number
  /** 待发送记录总数。 */
  pendingDispatches: number
  /** 发送失败记录总数。 */
  failedDispatches: number
  /** 各通知类型摘要。 */
  items: AdminNotificationOverviewItem[]
  /** 统计生成时间（毫秒时间戳）。 */
  generatedAt: number
}
