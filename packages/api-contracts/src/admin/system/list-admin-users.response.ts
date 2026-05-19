import type { PaginatedData } from '../../common'

/**
 * 后台用户列表行摘要。
 */
export type AdminUserListItem = {
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
  /** 当前拥有的角色 key 列表。 */
  roleKeys: string[]
  /** 最近一次登录时间；未登录时为 `null`。 */
  lastLoginAt: number | null
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}

export type ListAdminUsersResponseData = PaginatedData<AdminUserListItem>
