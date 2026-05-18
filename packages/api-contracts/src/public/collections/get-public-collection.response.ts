/**
 * 公开展示页中的藏品拥有者视图。
 */
export type PublicCollectionOwnerView = {
  /** 对外展示的会员编号。 */
  memberNo: string
  /** 公开展示给访客的会员昵称。 */
  nickname: string
  /** 公开展示给访客的会员头像地址。 */
  avatarUrl: string | null
}

/**
 * 查询公开展示页返回结构。
 */
export type GetPublicCollectionResponseData = {
  /** 对外展示的藏品编号。 */
  collectionNo: string
  /** 公开展示页 slug。 */
  slug: string
  /** 系列主键。 */
  seriesId: string
  /** 系列编号。 */
  seriesNo: string
  /** 系列名称。 */
  seriesName: string
  /** 批次主键。 */
  batchId: string
  /** 批次编号。 */
  batchNo: string
  /** 批次名称。 */
  batchName: string
  /** 当前公开版本主键。 */
  contentVersionId: string
  /** 当前公开版本号。 */
  versionNo: number
  /** 展示标题。 */
  title: string
  /** 展示摘要。 */
  summary: string
  /** 展示封面图地址。 */
  coverImageUrl: string | null
  /** 结构化展示内容载荷。 */
  contentPayload: Record<string, unknown>
  /** 当前公开展示的拥有者信息。 */
  owner: PublicCollectionOwnerView
  /** 一级评论数量。 */
  topLevelCommentCount: number
  /** 公开评论总数（含回复）。 */
  totalCommentCount: number
  /** 实际公开发布时间。 */
  publishedAt: string
}
