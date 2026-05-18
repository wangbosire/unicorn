/**
 * 藏品详情中的拥有者摘要。
 */
export type AdminCollectionOwnerSummary = {
  /** 会员主键。 */
  memberId: string
  /** 对外会员编号。 */
  memberNo: string
  /** 会员昵称。 */
  nickname: string
}

/**
 * 藏品详情中的内容版本摘要。
 */
export type AdminCollectionContentVersionSummary = {
  /** 内容版本主键。 */
  id: string
  /** 单藏品内递增版本号。 */
  versionNo: number
  /** 展示标题。 */
  title: string
  /** 展示摘要。 */
  summary: string
  /** 封面图地址。 */
  coverImageUrl: string | null
  /** 当前编辑状态。 */
  editStatus: string
  /** 当前公开状态。 */
  publishStatus: string
  /** 最新审核状态；无记录时为 `null`。 */
  contentReviewStatus: string | null
  /** 提交审核时间（毫秒时间戳）；无则为 `null`。 */
  submittedAt: number | null
  /** 实际发布时间（毫秒时间戳）；无则为 `null`。 */
  publishedAt: number | null
}

/**
 * 后台藏品详情。
 */
export type AdminCollectionDetail = {
  /** 藏品主键。 */
  id: string
  /** 对外展示的藏品编号。 */
  collectionNo: string
  /** 系列主键。 */
  seriesId: string
  /** 系列名称。 */
  seriesName: string
  /** 批次主键。 */
  batchId: string
  /** 批次名称。 */
  batchName: string
  /** 当前藏品资产状态。 */
  status: string
  /** 当前拥有者；未领取时为 `null`。 */
  owner: AdminCollectionOwnerSummary | null
  /** 实际领取时间（毫秒时间戳）；未领取时为 `null`。 */
  claimedAt: number | null
  /** 最新内容版本摘要；无版本时为 `null`。 */
  latestContentVersion: AdminCollectionContentVersionSummary | null
  /** 当前公开版本摘要；无公开版本时为 `null`。 */
  publishedContentVersion: AdminCollectionContentVersionSummary | null
  /** 内容版本总数。 */
  contentVersionCount: number
  /** 评论总数。 */
  commentsCount: number
  /** 最近一次评论时间（毫秒时间戳）；无评论时为 `null`。 */
  latestCommentAt: number | null
  /** 审核记录总数。 */
  reviewRecordCount: number
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}
