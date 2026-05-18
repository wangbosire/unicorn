/**
 * 后台审核记录详情。
 */
export type CollectionReviewDetail = {
  /** 审核记录主键。 */
  reviewId: string
  /** 藏品主键。 */
  collectionId: string
  /** 藏品编号。 */
  collectionNo: string
  /** 所属系列主键。 */
  seriesId: string
  /** 所属系列编号。 */
  seriesNo: string
  /** 所属系列名称。 */
  seriesName: string
  /** 所属批次主键。 */
  batchId: string
  /** 所属批次编号。 */
  batchNo: string
  /** 所属批次名称。 */
  batchName: string
  /** 当前持有者会员主键；未领取时为 `null`。 */
  ownerMemberId: string | null
  /** 当前持有者会员编号；未领取时为 `null`。 */
  ownerMemberNo: string | null
  /** 当前持有者会员昵称；未领取时为 `null`。 */
  ownerMemberNickname: string | null
  /** 内容版本主键。 */
  contentVersionId: string
  /** 内容版本号。 */
  versionNo: number
  /** 创建该版本的会员主键；系统生成或缺失时为 `null`。 */
  createdByMemberId: string | null
  /** 创建该版本的会员编号；系统生成或缺失时为 `null`。 */
  createdByMemberNo: string | null
  /** 创建该版本的会员昵称；系统生成或缺失时为 `null`。 */
  createdByMemberNickname: string | null
  /** 审核阶段。 */
  reviewStage: string
  /** 审核状态。 */
  reviewStatus: string
  /** 审核来源。 */
  reviewSource: string
  /** 审核原因或备注。 */
  reviewReason: string | null
  /** 版本标题。 */
  title: string
  /** 版本摘要。 */
  summary: string
  /** 封面图地址。 */
  coverImageUrl: string | null
  /** 结构化内容载荷。 */
  contentPayload: Record<string, unknown>
  /** 当前编辑状态。 */
  editStatus: string
  /** 当前公开状态。 */
  publishStatus: string
  /** 提交时间（毫秒时间戳）；未提交为 `null`。 */
  submittedAt: number | null
  /** 审核完成时间（毫秒时间戳）；未完成为 `null`。 */
  reviewedAt: number | null
  /** 审核记录创建时间（毫秒时间戳）。 */
  createdAt: number
  /** 审核人展示名；系统审核为 `null`。 */
  reviewedByDisplayName: string | null
}
