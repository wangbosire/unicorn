/**
 * 标记消息已读返回结构。
 */
export type MarkMemberMessageReadResponseData = {
  /** 消息主键。 */
  id: string
  /** 是否已读。 */
  isRead: boolean
  /** 已读时间（毫秒时间戳）。 */
  readAt: number
}
