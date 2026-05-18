import type { PaginatedData } from '../../common/pagination'

/**
 * 当前会员消息列表项。
 */
export type MemberMessageListItem = {
  /** 消息主键。 */
  id: string
  /** 消息类型。 */
  messageType: string
  /** 消息标题。 */
  title: string
  /** 消息正文。 */
  content: string
  /** 是否已读。 */
  isRead: boolean
  /** 已读时间（毫秒时间戳）；未读时为 `null`。 */
  readAt: number | null
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
}

/**
 * 查询当前会员消息列表返回结构。
 */
export type ListMemberMessagesResponseData = PaginatedData<MemberMessageListItem>
