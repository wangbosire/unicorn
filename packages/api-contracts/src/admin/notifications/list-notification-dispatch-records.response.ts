import type { PaginatedData } from '../../common/pagination'

/**
 * 后台通知派发记录列表项。
 */
export type AdminNotificationDispatchRecordListItem = {
  /** 派发记录主键。 */
  dispatchRecordId: string
  /** 对应消息主键。 */
  messageId: string
  /** 消息类型。 */
  messageType: string
  /** 事件中文名。 */
  eventLabel: string
  /** 目标会员主键。 */
  memberId: string
  /** 消息标题。 */
  title: string
  /** 消息正文。 */
  content: string
  /** 派发渠道。 */
  channel: string
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
 * 查询后台通知派发记录列表返回结构。
 */
export type ListNotificationDispatchRecordsResponseData =
  PaginatedData<AdminNotificationDispatchRecordListItem>
