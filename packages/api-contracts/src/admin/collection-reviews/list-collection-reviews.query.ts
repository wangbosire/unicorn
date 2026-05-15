import type { PaginationQuery } from '../../common'

/**
 * 查询藏品内容审核队列参数。
 */
export type ListCollectionReviewsQuery = PaginationQuery & {
  /** 按审核状态筛选。 */
  reviewStatus?: string
  /** 按系列筛选。 */
  seriesId?: string
  /** 按批次筛选。 */
  batchId?: string
  /** 按藏品对外编号（`collectionNo`）精确筛选，用于按单件藏品查看审核轨迹。 */
  collectionNo?: string
}
