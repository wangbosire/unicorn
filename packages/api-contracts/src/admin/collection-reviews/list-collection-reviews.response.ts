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
  /** 对应内容版本主键。 */
  contentVersionId: string
  /** 单藏品内递增的版本号。 */
  versionNo: number
  /** 审核阶段。 */
  reviewStage: string
  /** 当前审核状态。 */
  reviewStatus: string
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
