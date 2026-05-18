import type { PaginationQuery } from '../../common/pagination'

/**
 * 后台转让记录列表查询参数。
 */
export type ListTransferOrdersQuery = PaginationQuery & {
  /** 藏品编号精确筛选。 */
  collectionNo?: string
  /** 转出会员编号精确筛选。 */
  fromMemberNo?: string
  /** 转入会员编号精确筛选。 */
  toMemberNo?: string
  /** 转让方式筛选。 */
  transferMode?: string
  /** 转让状态筛选。 */
  status?: string
}
