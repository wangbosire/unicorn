import type { PaginatedData } from '../../common'

/**
 * 藏品内容审核列表项。
 */
export type CollectionReviewListItem = {
  /** 审核记录主键。 */
  reviewId: string
  /** 所属藏品主键。 */
  collectionId: string
  /** 对外展示的藏品编号。 */
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
  /** 当前持有者会员编号；未领取时为 `null`。 */
  ownerMemberNo: string | null
  /** 当前持有者会员昵称；未领取时为 `null`。 */
  ownerMemberNickname: string | null
  /** 对应内容版本主键。 */
  contentVersionId: string
  /** 单藏品内递增的版本号。 */
  versionNo: number
  /** 版本标题。 */
  title: string
  /** 审核阶段。 */
  reviewStage: string
  /** 当前审核状态。 */
  reviewStatus: string
  /** 当前编辑状态。 */
  editStatus: string
  /** 当前公开状态。 */
  publishStatus: string
  /**
   * 审核原因或备注（如机审拒绝说明、人工闸门「待人工」说明等）；
   * 无内容时为 `null`。
   */
  reviewReason: string | null
  /** 提交审核时间戳，单位毫秒。 */
  submittedAt: number
}

/**
 * 查询藏品内容审核队列返回结构。
 */
export type ListCollectionReviewsResponseData =
  PaginatedData<CollectionReviewListItem>
