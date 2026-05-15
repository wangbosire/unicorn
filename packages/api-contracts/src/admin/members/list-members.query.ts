import type { PaginationQuery } from '../../common'

/**
 * 后台会员列表查询参数。
 */
export type ListMembersQuery = PaginationQuery & {
  /**
   * 按会员编号或昵称模糊匹配（不区分大小写，依赖数据库能力）。
   */
  search?: string
  /** 按会员状态筛选，与 `MemberStatus` 枚举一致。 */
  status?: string
}
