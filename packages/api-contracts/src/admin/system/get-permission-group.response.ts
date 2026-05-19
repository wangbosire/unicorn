/**
 * 权限组详情中的权限点摘要。
 */
export type AdminPermissionInGroupSummary = {
  /** 权限点主键。 */
  permissionId: string
  /** 稳定权限 key。 */
  permissionKey: string
  /** 权限名称。 */
  permissionName: string
  /** 权限类型。 */
  permissionType: string
  /** 权限状态。 */
  status: string
}

/**
 * 权限组详情中的菜单摘要。
 */
export type AdminMenuInPermissionGroupSummary = {
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
}

/**
 * 权限组详情。
 */
export type AdminPermissionGroupDetail = {
  /** 权限组主键。 */
  permissionGroupId: string
  /** 稳定权限组 key。 */
  groupKey: string
  /** 权限组名称。 */
  groupName: string
  /** 权限组类别。 */
  groupType: string
  /** 权限组说明；无则为 `null`。 */
  description: string | null
  /** 权限组状态。 */
  status: string
  /** 是否为内置权限组。 */
  isBuiltin: boolean
  /** 排序值。 */
  sortOrder: number
  /** 当前包含的权限点摘要。 */
  permissions: AdminPermissionInGroupSummary[]
  /** 当前绑定的菜单摘要。 */
  menus: AdminMenuInPermissionGroupSummary[]
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}
