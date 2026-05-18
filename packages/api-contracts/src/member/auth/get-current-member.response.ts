/**
 * 获取当前会员返回结构。
 */
export type GetCurrentMemberResponseData = {
  /** 会员主键。 */
  id: string
  /** 对外展示的会员编号。 */
  memberNo: string
  /** 会员昵称。 */
  nickname: string
  /** 会员头像地址。 */
  avatarUrl: string
  /** 会员手机号；未绑定时为 `null`。 */
  mobile: string | null
  /** 会员状态。 */
  status: string
  /** 注册时间戳，单位毫秒。 */
  registeredAt: number
  /** 当前绑定的微信渠道数量。 */
  wechatBindingCount: number
  /** 当前持有的藏品数量。 */
  ownedCollectionCount: number
  /** 已发布评论数量。 */
  commentCount: number
}
