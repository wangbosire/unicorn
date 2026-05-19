/**
 * 角色权限保存请求。
 * 前端可同时提交“选中的权限组”和“额外单独勾选的 action 权限”。
 */
export type UpdateRolePermissionsRequest = {
  /** 选中的权限组主键列表。 */
  permissionGroupIds: string[]
  /** 额外单独勾选的权限点主键列表。 */
  permissionIds: string[]
  /** 本次变更说明；无则为 `null`。 */
  changeReason?: string | null
}
