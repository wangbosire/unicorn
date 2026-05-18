import type { PaginationQuery } from '../../common/pagination'

/**
 * 查询当前会员消息列表参数。
 */
export type ListMemberMessagesQuery = PaginationQuery & {
  /** 仅查看未读消息。 */
  unreadOnly?: boolean | 'true' | 'false'
}
