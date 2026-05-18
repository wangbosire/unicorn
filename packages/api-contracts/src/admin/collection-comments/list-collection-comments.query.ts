/**
 * 后台评论列表查询参数。
 */
export type ListCollectionCommentsQuery = {
  page?: string
  pageSize?: string
  /** 藏品编号精确筛选。 */
  collectionNo?: string
  /** 评论状态筛选。 */
  status?: string
}
