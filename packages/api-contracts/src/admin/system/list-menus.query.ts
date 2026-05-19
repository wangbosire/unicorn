import type { PaginationQuery } from '../../common'

/**
 * 菜单列表查询参数。
 */
export type ListMenusQuery = PaginationQuery & {
  /** 按菜单 key、名称或路由模糊搜索。 */
  search?: string
  /** 按菜单状态筛选。 */
  status?: string
  /** 按菜单类型筛选。 */
  menuType?: string
  /** 按是否内置筛选。 */
  isBuiltin?: string | boolean
  /** 按父菜单筛选。 */
  parentId?: string
  /** 仅返回根菜单。 */
  rootOnly?: string | boolean
}
