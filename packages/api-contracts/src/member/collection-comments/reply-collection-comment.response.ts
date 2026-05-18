/**
 * 会员回复评论后的返回结构。
 */
export type ReplyCollectionCommentResponseData = {
  /** 回复评论主键。 */
  commentId: string
  /** 关联藏品主键。 */
  collectionId: string
  /** 目标公开藏品编号。 */
  collectionNo: string
  /** 当前挂载的公开内容版本主键。 */
  contentVersionId: string
  /** 父评论主键。 */
  parentCommentId: string
  /** 根评论主键。 */
  rootCommentId: string
  /** 回复当前状态。 */
  status: string
  /** 最新审核原因；无原因时为 `null`。 */
  reviewReason: string | null
  /** 实际公开时间（毫秒时间戳）；未公开时为 `null`。 */
  publishedAt: number | null
  /** 回复创建时间（毫秒时间戳）。 */
  createdAt: number
}
