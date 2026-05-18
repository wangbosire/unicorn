/**
 * 当前会员视图。
 */
export type CurrentMember = {
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

/**
 * 小程序登录返回结构。
 */
export type WechatMiniappLoginResponseData = {
  /** 会员访问令牌。 */
  accessToken: string
  /** 当前会员信息。 */
  member: CurrentMember
}
