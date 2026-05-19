import type { PaginationQuery } from '../../common'

/**
 * 后台用户列表查询参数。
 */
export type ListAdminUsersQuery = PaginationQuery & {
  /** 按账号编号、用户名或展示名模糊搜索。 */
  search?: string
  /** 按后台用户状态筛选。 */
  status?: string
  /** 按角色 key 筛选。 */
  roleKey?: string
}
