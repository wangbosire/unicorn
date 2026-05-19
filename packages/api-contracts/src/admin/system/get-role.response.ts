/**
 * 角色详情中的权限点摘要。
 */
export type AdminRolePermissionSummary = {
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
  /** 是否为内置权限。 */
  isBuiltin: boolean
}

/**
 * 角色详情中的后台用户摘要。
 */
export type AdminRoleAssignedUserSummary = {
  /** 后台用户主键。 */
  adminUserId: string
  /** 后台账号编号。 */
  accountNo: string
  /** 登录用户名。 */
  username: string
  /** 展示名称。 */
  displayName: string
  /** 后台用户状态。 */
  status: string
}

/**
 * 角色详情。
 */
export type AdminRoleDetail = {
  /** 角色主键。 */
  roleId: string
  /** 稳定角色 key。 */
  roleKey: string
  /** 角色名称。 */
  roleName: string
  /** 角色说明；无则为 `null`。 */
  description: string | null
  /** 角色状态。 */
  status: string
  /** 是否为内置角色。 */
  isBuiltin: boolean
  /** 排序值。 */
  sortOrder: number
  /** 权限版本号。 */
  permissionVersion: number
  /** 当前权限点摘要。 */
  permissions: AdminRolePermissionSummary[]
  /** 当前分配到此角色的后台用户摘要。 */
  assignedUsers: AdminRoleAssignedUserSummary[]
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}
