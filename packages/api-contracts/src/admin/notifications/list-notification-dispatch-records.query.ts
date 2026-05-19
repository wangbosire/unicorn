import type { PaginationQuery } from '../../common/pagination'

/**
 * 查询后台通知派发记录列表参数。
 */
export type ListNotificationDispatchRecordsQuery = PaginationQuery & {
  /** 按消息类型筛选。 */
  messageType?: string
  /** 按渠道筛选。 */
  channel?: 'IN_APP' | 'MINIAPP_SUBSCRIPTION' | 'WECHAT_MP'
  /** 按派发状态筛选。 */
  status?: 'PENDING' | 'SENT' | 'FAILED'
  /** 按归一化失败标签筛选。 */
  failureCode?: string
}
