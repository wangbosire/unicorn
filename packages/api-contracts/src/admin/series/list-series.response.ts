import type { PaginatedData } from '../../common'

/**
 * 系列列表项。
 */
export type SeriesListItem = {
  /** 系列主键。 */
  id: string
  /** 对外展示的系列编号。 */
  seriesNo: string
  /** 系列名称。 */
  name: string
  /** 系列描述。 */
  description: string
  /** 系列状态。 */
  status: string
  /** 该系列下的发行批次数量。 */
  batchCount: number
  /** 该系列下仍处于启用状态的发行批次数量。 */
  enabledBatchCount: number
  /** 该系列下已生成的藏品数量。 */
  collectionCount: number
  /** 创建时间戳，单位毫秒。 */
  createdAt: number
}

/**
 * 查询系列列表返回结构。
 */
export type ListSeriesResponseData = PaginatedData<SeriesListItem>
