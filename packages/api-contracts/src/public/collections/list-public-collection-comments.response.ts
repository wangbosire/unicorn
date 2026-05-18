/**
 * 公开评论中的回复摘要。
 */
export type PublicCollectionCommentReplyItem = {
  /** 评论主键。 */
  commentId: string
  /** 根评论主键。 */
  rootCommentId: string | null
  /** 评论会员昵称。 */
  memberNickname: string
  /** 评论会员头像地址。 */
  memberAvatarUrl: string | null
  /** 评论正文。 */
  content: string
  /** 发布时间（ISO 字符串）。 */
  publishedAt: string
}

/**
 * 公开评论列表中的一级评论项。
 */
export type PublicCollectionCommentItem = {
  /** 评论主键。 */
  commentId: string
  /** 评论会员昵称。 */
  memberNickname: string
  /** 评论会员头像地址。 */
  memberAvatarUrl: string | null
  /** 评论正文。 */
  content: string
  /** 发布时间（ISO 字符串）。 */
  publishedAt: string
  /** 当前一级评论下的公开回复数量。 */
  replyCount: number
  /** 二级回复列表。 */
  replies: PublicCollectionCommentReplyItem[]
}

/**
 * 公开评论列表返回结构。
 */
export type ListPublicCollectionCommentsResponseData = {
  /** 当前公开藏品编号。 */
  collectionNo: string
  /** 当前公开 slug。 */
  slug: string
  /** 一级评论数量。 */
  topLevelCommentCount: number
  /** 公开评论总数（含回复）。 */
  totalCommentCount: number
  /** 一级评论列表。 */
  items: PublicCollectionCommentItem[]
}
