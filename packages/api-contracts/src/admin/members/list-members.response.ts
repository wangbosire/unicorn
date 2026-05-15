import type { PaginatedData } from '../../common'

/**
 * 后台会员列表单行摘要。
 */
export type AdminMemberListItem = {
  /** 会员主键。 */
  memberId: string
  /** 对外会员编号。 */
  memberNo: string
  /** 昵称。 */
  nickname: string
  /** 手机号；无则为 `null`。 */
  mobile: string | null
  /** 会员状态枚举字符串。 */
  status: string
  /** 注册时间（毫秒时间戳）。 */
  registeredAt: number
  /**
   * 微信绑定渠道摘要（如「微信小程序」）；无绑定为 `null`。
   */
  wechatChannelsSummary: string | null
  /** 当前持有藏品数量。 */
  ownedCollectionsCount: number
}

export type ListMembersResponseData = PaginatedData<AdminMemberListItem>
