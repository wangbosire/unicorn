/**
 * 权限组成员保存请求。
 */
export type UpdatePermissionGroupPermissionsRequest = {
  /** 本次绑定后的权限点主键列表。 */
  permissionIds: string[]
  /** 本次变更说明；无则为 `null`。 */
  changeReason?: string | null
}
