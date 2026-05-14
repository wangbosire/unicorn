/**
 * 发行批次详情。
 */
export type IssuanceBatchDetail = {
  /** 批次主键。 */
  id: string
  /** 对外展示的批次编号。 */
  batchNo: string
  /** 所属系列主键。 */
  seriesId: string
  /** 所属系列名称。 */
  seriesName: string
  /** 所属系列状态（如 ENABLED / DISABLED）。 */
  seriesStatus: string
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
  /** 运营备注。 */
  remark: string | null
  /** 创建时间戳，单位毫秒。 */
  createdAt: number
  /** 更新时间戳，单位毫秒。 */
  updatedAt: number
}
