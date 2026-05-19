import type { PaginatedData } from '../../common/pagination'

/**
 * 后台通知失败聚合项。
 * 按事件模板、渠道和失败原因聚合。
 */
export type AdminNotificationFailureSummaryItem = {
  /** 事件模板键。 */
  messageType: string
  /** 事件中文名。 */
  eventLabel: string
  /** 派发渠道。 */
  channel: string
  /** 归一化失败编码。 */
  failureCode: string
  /** 归一化失败标签。 */
  failureReason: string
  /** 原始失败样例，便于排障时参考。 */
  sampleReason: string | null
  /** 失败总次数。 */
  failedCount: number
  /** 受影响消息数。 */
  affectedMessages: number
  /** 最近一次失败时间（毫秒时间戳）。 */
  latestFailedAt: number
  /** 最近一条失败派发记录主键。 */
  latestDispatchRecordId: string
}

/**
 * 查询后台通知失败聚合视图返回结构。
 */
export type ListNotificationFailureSummaryResponseData =
  PaginatedData<AdminNotificationFailureSummaryItem>
