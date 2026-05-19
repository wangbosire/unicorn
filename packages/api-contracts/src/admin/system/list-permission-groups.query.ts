import type { PaginationQuery } from '../../common'

/**
 * 权限组列表查询参数。
 */
export type ListPermissionGroupsQuery = PaginationQuery & {
  /** 按权限组 key、名称模糊搜索。 */
  search?: string
  /** 按权限组状态筛选。 */
  status?: string
  /** 按权限组类别筛选。 */
  groupType?: string
  /** 按是否内置筛选。 */
  isBuiltin?: string | boolean
}
