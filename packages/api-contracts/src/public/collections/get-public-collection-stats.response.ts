/**
 * 公开展示页统计摘要。
 */
export type PublicCollectionStats = {
  /** 藏品编号。 */
  collectionNo: string
  /** 当前公开 slug。 */
  slug: string
  /** 当前持有者会员编号；无持有者时为 `null`。 */
  ownerMemberNo: string | null
  /** 当前持有者会员昵称；无持有者时为 `null`。 */
  ownerNickname: string | null
  /** 已审核内容版本数量。 */
  approvedVersionCount: number
  /** 当前是否存在公开中的版本。 */
  hasPublishedContent: boolean
  /** 当前最高已审核版本号；不存在时为 `null`。 */
  latestApprovedVersionNo: number | null
  /** 当前公开版本号；无公开内容时为 `null`。 */
  publishedVersionNo: number | null
  /** 一级评论数量。 */
  topLevelCommentCount: number
  /** 公开评论总数（含回复）。 */
  totalCommentCount: number
  /** 最近发布时间（ISO 字符串）；无公开内容时为 `null`。 */
  publishedAt: string | null
}
