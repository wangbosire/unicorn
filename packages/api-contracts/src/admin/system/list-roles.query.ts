import type { PaginationQuery } from '../../common'

/**
 * 角色列表查询参数。
 */
export type ListRolesQuery = PaginationQuery & {
  /** 按角色 key、名称模糊搜索。 */
  search?: string
  /** 按角色状态筛选。 */
  status?: string
  /** 按是否内置筛选。 */
  isBuiltin?: string | boolean
}
