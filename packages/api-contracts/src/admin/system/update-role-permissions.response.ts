/**
 * 角色权限保存响应。
 */
export type UpdateRolePermissionsResponseData = {
  /** 角色主键。 */
  roleId: string
  /** 稳定角色 key。 */
  roleKey: string
  /** 更新后的权限版本号。 */
  permissionVersion: number
  /** 本次最终生效的权限组主键列表。 */
  permissionGroupIds: string[]
  /** 本次最终生效的权限点主键列表。 */
  permissionIds: string[]
  /** 本次最终生效的权限 key 列表。 */
  permissionKeys: string[]
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}
