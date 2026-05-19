/**
 * 菜单详情中的权限组摘要。
 */
export type AdminMenuPermissionGroupSummary = {
  /** 权限组主键。 */
  permissionGroupId: string
  /** 稳定权限组 key。 */
  groupKey: string
  /** 权限组名称。 */
  groupName: string
  /** 权限组状态。 */
  status: string
}

/**
 * 菜单详情中的子菜单摘要。
 */
export type AdminMenuChildSummary = {
  /** 菜单主键。 */
  menuId: string
  /** 稳定菜单 key。 */
  menuKey: string
  /** 菜单名称。 */
  menuName: string
  /** 菜单类型。 */
  menuType: string
  /** 菜单状态。 */
  status: string
  /** 排序值。 */
  sortOrder: number
}

/**
 * 菜单详情。
 */
export type AdminMenuDetail = {
  /** 菜单主键。 */
  menuId: string
  /** 父菜单主键；根节点为 `null`。 */
  parentId: string | null
  /** 父菜单名称；根节点为 `null`。 */
  parentName: string | null
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
  /** 当前绑定的权限组摘要。 */
  permissionGroups: AdminMenuPermissionGroupSummary[]
  /** 当前直接子菜单摘要。 */
  children: AdminMenuChildSummary[]
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}
