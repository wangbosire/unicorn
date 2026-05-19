import type { PaginationQuery } from '../../common/pagination'

/**
 * 查询后台通知模板列表参数。
 */
export type ListNotificationTemplatesQuery = PaginationQuery & {
  /** 按模板状态筛选。 */
  status?: 'ACTIVE' | 'DISABLED'
}
