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
  /** 会员状态。 */
  status: string
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
