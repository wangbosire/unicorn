/**
 * 权限点详情中的权限组摘要。
 */
export type AdminPermissionGroupSummary = {
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
 * 权限点详情。
 */
export type AdminPermissionDetail = {
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
  /** 当前归属的权限组摘要。 */
  groups: AdminPermissionGroupSummary[]
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}
