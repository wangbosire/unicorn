/**
 * 发表评论请求体。
 */
export type CreateCollectionCommentRequest = {
  /** 目标公开藏品编号。 */
  collectionNo: string
  /** 评论正文。 */
  content: string
}
