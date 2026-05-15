/**
 * 按藏品（及可选内容版本）查询审核轨迹的请求参数。
 * 与 `GET /admin-api/collection-reviews/history` 查询串对齐。
 */
export type ListCollectionReviewHistoryQuery = {
  /**
   * 藏品对外编号（`collectionNo`），精确匹配；服务端校验非空。
   */
  collectionNo?: string
  /**
   * 内容版本主键；若提供则仅返回该版本下的审核记录。
   */
  contentVersionId?: string
}
