/**
 * 后台用户角色分配响应。
 */
export type UpdateAdminUserRolesResponseData = {
  /** 后台用户主键。 */
  adminUserId: string
  /** 后台账号编号。 */
  accountNo: string
  /** 分配后的角色主键列表。 */
  roleIds: string[]
  /** 分配后的角色 key 列表。 */
  roleKeys: string[]
  /** 更新后的鉴权版本号。 */
  authzVersion: number
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}
