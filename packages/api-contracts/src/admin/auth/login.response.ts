/**
 * 后台登录用户视图。
 */
export type AdminAuthUser = {
  /** 后台用户主键。 */
  id: string
  /** 对外展示和审计使用的后台账号编号。 */
  accountNo: string
  /** 登录用户名。 */
  username: string
  /** 展示名称。 */
  displayName: string
  /** 当前账号状态。 */
  status: string
  /** 最近登录时间戳；从未登录时为 `null`。 */
  lastLoginAt: number | null
  /** 角色显示名称列表。 */
  roleNames: string[]
  /** 当前用户拥有的角色 key 列表。 */
  roles: string[]
  /**
   * 当前会话可访问的权限点 key 列表。
   * 包含 `*` 时表示拥有全部权限；权限变更后需重新登录以刷新令牌内声明。
   */
  permissionKeys: string[]
  /** 已审核内容记录数量。 */
  reviewedContentCount: number
  /** 已审核评论记录数量。 */
  reviewedCommentCount: number
}

/**
 * 后台登录返回结构。
 */
export type AdminLoginResponseData = {
  /** 后台访问令牌。 */
  accessToken: string
  /** 当前登录后台用户信息。 */
  user: AdminAuthUser
}
