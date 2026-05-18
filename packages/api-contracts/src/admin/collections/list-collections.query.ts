import type { PaginationQuery } from '../../common'

/**
 * 后台藏品列表查询参数。
 */
export type ListCollectionsQuery = PaginationQuery & {
  /** 按所属系列筛选。 */
  seriesId?: string
  /** 按所属批次筛选。 */
  batchId?: string
  /** 按藏品资产状态筛选。 */
  status?: string
  /** 按当前拥有者会员主键筛选。 */
  ownerMemberId?: string
  /** 按藏品编号精确筛选。 */
  collectionNo?: string
}
