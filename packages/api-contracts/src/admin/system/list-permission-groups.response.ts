import type { PaginatedData } from '../../common'

/**
 * 权限组列表行摘要。
 */
export type AdminPermissionGroupListItem = {
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
  /** 当前包含的权限点数量。 */
  permissionCount: number
  /** 当前绑定的菜单数量。 */
  menuCount: number
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}

export type ListPermissionGroupsResponseData =
  PaginatedData<AdminPermissionGroupListItem>
