/**
 * 后台评论审核队列查询参数。
 */
export type ListCollectionCommentReviewsQuery = {
  page?: string
  pageSize?: string
  /** 藏品编号精确筛选。 */
  collectionNo?: string
  /** 审核状态筛选。 */
  reviewStatus?: string
}
