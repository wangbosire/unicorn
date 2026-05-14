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
  /** 会员状态。 */
  status: string
}
