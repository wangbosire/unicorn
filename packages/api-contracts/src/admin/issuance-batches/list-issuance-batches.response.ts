import type { PaginatedData } from '../../common'

/**
 * 发行批次列表项。
 */
export type IssuanceBatchListItem = {
  /** 批次主键。 */
  id: string
  /** 对外展示的批次编号。 */
  batchNo: string
  /** 所属系列主键。 */
  seriesId: string
  /** 所属系列名称。 */
  seriesName: string
  /** 批次名称。 */
  name: string
  /** 计划发行数量。 */
  quantity: number
  /** 已生成激活码数量。 */
  generatedCount: number
  /** 批次状态。 */
  status: string
  /** 激活有效开始时间戳，单位毫秒。 */
  activateValidFrom: number
  /** 激活有效结束时间戳，单位毫秒。 */
  activateValidTo: number
}

/**
 * 查询发行批次列表返回结构。
 */
export type ListIssuanceBatchesResponseData = PaginatedData<IssuanceBatchListItem>
