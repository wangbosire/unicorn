import type { PaginationQuery } from '../../common'

/**
 * 查询系列列表参数。
 */
export type ListSeriesQuery = PaginationQuery & {
  /** 按系列名称或编号模糊搜索。 */
  keyword?: string
  /** 按系列状态筛选。 */
  status?: string
}
