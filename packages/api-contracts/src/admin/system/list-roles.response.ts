import type { PaginatedData } from '../../common'

/**
 * 角色列表行摘要。
 */
export type AdminRoleListItem = {
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
  /** 当前分配的权限点数量。 */
  permissionCount: number
  /** 当前分配的后台用户数量。 */
  assignedUserCount: number
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}

export type ListRolesResponseData = PaginatedData<AdminRoleListItem>
