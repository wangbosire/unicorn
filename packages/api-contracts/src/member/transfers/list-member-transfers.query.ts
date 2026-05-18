import type { PaginationQuery } from '../../common/pagination'

/**
 * 查询当前会员转让记录参数。
 */
export type ListMemberTransfersQuery = PaginationQuery & {
  /** 仅查看当前会员发起的记录。 */
  direction?: 'outgoing' | 'incoming' | 'all'
  /** 藏品编号精确筛选。 */
  collectionNo?: string
  /** 转让状态筛选。 */
  status?: string
}
