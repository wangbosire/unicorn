/**
 * 会员提交评论后的返回结构。
 */
export type CreateCollectionCommentResponseData = {
  /** 评论主键。 */
  commentId: string
  /** 关联藏品主键。 */
  collectionId: string
  /** 目标公开藏品编号。 */
  collectionNo: string
  /** 当前挂载的公开内容版本主键。 */
  contentVersionId: string
  /** 评论当前状态。 */
  status: string
  /** 最新审核原因；无原因时为 `null`。 */
  reviewReason: string | null
  /** 实际公开时间（毫秒时间戳）；未公开时为 `null`。 */
  publishedAt: number | null
  /** 评论创建时间（毫秒时间戳）。 */
  createdAt: number
}
