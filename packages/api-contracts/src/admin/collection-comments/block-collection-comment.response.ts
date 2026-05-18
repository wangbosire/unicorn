/**
 * 评论屏蔽返回结构。
 */
export type BlockCollectionCommentResponseData = {
  /** 评论主键。 */
  commentId: string
  /** 更新后的评论状态。 */
  status: string
  /** 屏蔽完成时间（毫秒时间戳）。 */
  reviewedAt: number
}
