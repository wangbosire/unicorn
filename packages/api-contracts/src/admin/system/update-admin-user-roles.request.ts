/**
 * 后台用户角色分配请求。
 */
export type UpdateAdminUserRolesRequest = {
  /** 本次分配后的角色主键列表。 */
  roleIds: string[]
  /** 本次变更说明；无则为 `null`。 */
  changeReason?: string | null
}
