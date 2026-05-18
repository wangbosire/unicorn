/**
 * 评论审核通过返回结构。
 */
export type ApproveCollectionCommentResponseData = {
  /** 评论主键。 */
  commentId: string
  /** 更新后的评论状态。 */
  status: string
  /** 审核完成时间（毫秒时间戳）。 */
  reviewedAt: number
}
