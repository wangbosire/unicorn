/**
 * 人工通过藏品内容审核返回结构。
 */
export type ApproveCollectionReviewResponseData = {
  /** 审核记录主键。 */
  reviewId: string
  /** 审核后的状态。 */
  reviewStatus: string
  /** 同步更新后的公开状态。 */
  publishStatus: string
  /** 审核完成时间戳，单位毫秒。 */
  reviewedAt: number
}
