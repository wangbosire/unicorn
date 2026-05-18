/**
 * 评论审核驳回返回结构。
 */
export type RejectCollectionCommentResponseData = {
  /** 评论主键。 */
  commentId: string
  /** 更新后的评论状态。 */
  status: string
  /** 审核完成时间（毫秒时间戳）。 */
  reviewedAt: number
}
