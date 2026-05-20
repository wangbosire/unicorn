/**
 * 权限组成员保存响应。
 */
export type UpdatePermissionGroupPermissionsResponseData = {
  /** 权限组主键。 */
  permissionGroupId: string
  /** 稳定权限组 key。 */
  groupKey: string
  /** 生效的权限点主键列表。 */
  permissionIds: string[]
  /** 生效的权限 key 列表。 */
  permissionKeys: string[]
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}
