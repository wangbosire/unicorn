import type { PaginationQuery } from '../../common'

/**
 * 查询我的藏品列表参数。
 */
export type ListMyCollectionsQuery = PaginationQuery & {
  /** 按藏品状态筛选。 */
  status?: string
}
