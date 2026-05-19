/**
 * 单次通知派发尝试摘要。
 */
export type AdminNotificationDispatchAttempt = {
  /** 派发记录主键。 */
  dispatchRecordId: string
  /** 第几次尝试，从 1 开始。 */
  attemptNo: number
  /** 派发状态。 */
  status: 'PENDING' | 'SENT' | 'FAILED'
  /** 归一化失败编码；非失败时可为空。 */
  failureCode: string | null
  /** 归一化失败标签；非失败时可为空。 */
  failureReason: string | null
  /** 渠道返回或失败原因。 */
  providerResponse: string | null
  /** 实际发送时间（毫秒时间戳）；未成功时为 `null`。 */
  sentAt: number | null
  /** 记录创建时间（毫秒时间戳）。 */
  createdAt: number
}

/**
 * 后台通知派发历史详情。
 */
export type GetNotificationDispatchHistoryResponseData = {
  /** 锚定的派发记录主键。 */
  dispatchRecordId: string
  /** 对应消息主键。 */
  messageId: string
  /** 派发渠道。 */
  channel: string
  /** 总尝试次数。 */
  totalAttempts: number
  /** 该消息该渠道的全部尝试，按时间正序。 */
  attempts: AdminNotificationDispatchAttempt[]
}
