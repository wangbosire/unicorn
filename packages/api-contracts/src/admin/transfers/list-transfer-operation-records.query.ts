import type { PaginationQuery } from '../../common/pagination'

/**
 * 后台转让运营处置记录列表查询参数。
 */
export type ListTransferOperationRecordsQuery = PaginationQuery & {
  /** 藏品编号精确筛选。 */
  collectionNo?: string
  /** 转让单号精确筛选。 */
  transferNo?: string
  /** 操作人账号编号精确筛选。 */
  operatorAdminAccountNo?: string
  /** 处置动作类型筛选。 */
  actionType?: string
}
