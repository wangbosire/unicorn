import type { PaginatedData } from '../../common'

/**
 * 权限点列表行摘要。
 */
export type AdminPermissionListItem = {
  /** 权限点主键。 */
  permissionId: string
  /** 稳定权限 key。 */
  permissionKey: string
  /** 权限名称。 */
  permissionName: string
  /** 权限类型。 */
  permissionType: string
  /** 权限说明；无则为 `null`。 */
  description: string | null
  /** 权限状态。 */
  status: string
  /** 是否为内置权限。 */
  isBuiltin: boolean
  /** 排序值。 */
  sortOrder: number
  /** 当前归属的权限组数量。 */
  groupCount: number
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}

export type ListPermissionsResponseData = PaginatedData<AdminPermissionListItem>
