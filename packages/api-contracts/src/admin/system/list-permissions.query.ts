import type { PaginationQuery } from '../../common'

/**
 * 权限点列表查询参数。
 */
export type ListPermissionsQuery = PaginationQuery & {
  /** 按权限 key、名称模糊搜索。 */
  search?: string
  /** 按权限状态筛选。 */
  status?: string
  /** 按权限类型筛选。 */
  permissionType?: string
  /** 按是否内置筛选。 */
  isBuiltin?: string | boolean
  /** 仅返回未归属任何权限组的孤儿权限。 */
  orphanOnly?: string | boolean
}
