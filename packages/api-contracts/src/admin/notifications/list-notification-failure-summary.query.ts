import type { PaginationQuery } from '../../common/pagination'

/**
 * 查询后台通知失败聚合视图参数。
 */
export type ListNotificationFailureSummaryQuery = PaginationQuery & {
  /** 可选事件模板键筛选。 */
  messageType?: string
  /** 可选派发渠道筛选。 */
  channel?: string
  /** 可选归一化失败编码筛选。 */
  failureCode?: string
}
