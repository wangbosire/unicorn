import type { PaginatedData } from '../../common'

/**
 * 菜单列表行摘要。
 */
export type AdminMenuListItem = {
  /** 菜单主键。 */
  menuId: string
  /** 父菜单主键；根节点为 `null`。 */
  parentId: string | null
  /** 稳定菜单 key。 */
  menuKey: string
  /** 菜单名称。 */
  menuName: string
  /** 菜单类型。 */
  menuType: string
  /** 前端路由路径或外链地址；无则为 `null`。 */
  routePath: string | null
  /** 前端图标标识；无则为 `null`。 */
  iconName: string | null
  /** 菜单状态。 */
  status: string
  /** 是否为内置菜单。 */
  isBuiltin: boolean
  /** 排序值。 */
  sortOrder: number
  /** 当前绑定的权限组数量。 */
  permissionGroupCount: number
  /** 当前直接子菜单数量。 */
  childCount: number
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}

export type ListMenusResponseData = PaginatedData<AdminMenuListItem>
