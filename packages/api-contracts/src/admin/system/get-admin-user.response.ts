/**
 * 后台用户详情中的角色摘要。
 */
export type AdminUserRoleSummary = {
  /** 角色主键。 */
  roleId: string
  /** 稳定角色 key。 */
  roleKey: string
  /** 角色名称。 */
  roleName: string
  /** 角色状态。 */
  status: string
  /** 是否为内置角色。 */
  isBuiltin: boolean
}

/**
 * 后台用户详情。
 */
export type AdminUserDetail = {
  /** 后台用户主键。 */
  adminUserId: string
  /** 后台账号编号。 */
  accountNo: string
  /** 登录用户名。 */
  username: string
  /** 展示名称。 */
  displayName: string
  /** 后台用户状态。 */
  status: string
  /** 当前鉴权版本号。 */
  authzVersion: number
  /** 当前角色摘要。 */
  roles: AdminUserRoleSummary[]
  /** 当前运行时有效的权限 key 列表。 */
  permissionKeys: string[]
  /** 已审核内容数。 */
  reviewedContentCount: number
  /** 已审核评论数。 */
  reviewedCommentCount: number
  /** 最近一次登录时间；未登录时为 `null`。 */
  lastLoginAt: number | null
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}
