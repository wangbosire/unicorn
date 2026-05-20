import type { PaginationQuery } from '../../common'

/**
 * 权限变更日志列表查询参数。
 */
export type ListAuthorizationChangeLogsQuery = PaginationQuery & {
  /** 按目标类型筛选。 */
  targetType?: string
  /** 按变更类型筛选。 */
  changeType?: string
  /** 按操作人后台用户主键筛选。 */
  operatorAdminUserId?: string
  /** 按目标主键筛选。 */
  targetId?: string
}
