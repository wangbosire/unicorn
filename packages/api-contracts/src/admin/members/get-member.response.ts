/**
 * 后台会员详情。
 */
export type AdminMemberDetail = {
  /** 会员主键。 */
  memberId: string
  /** 对外会员编号。 */
  memberNo: string
  /** 昵称。 */
  nickname: string
  /** 头像地址；无则为 `null`。 */
  avatarUrl: string | null
  /** 手机号；无则为 `null`。 */
  mobile: string | null
  /** 会员状态。 */
  status: string
  /** 注册时间（毫秒时间戳）。 */
  registeredAt: number
  /** 当前绑定渠道列表。 */
  wechatChannels: string[]
  /** 当前持有藏品数量。 */
  ownedCollectionsCount: number
  /** 已创建内容版本数量。 */
  createdContentVersionsCount: number
  /** 已发布评论数量。 */
  commentsCount: number
  /** 最近一次评论时间（毫秒时间戳）；无评论时为 `null`。 */
  latestCommentAt: number | null
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}
