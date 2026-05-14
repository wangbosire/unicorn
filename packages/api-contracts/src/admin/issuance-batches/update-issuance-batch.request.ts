/**
 * 编辑发行批次请求。
 */
export type UpdateIssuanceBatchRequest = {
  /** 批次名称。 */
  name?: string
  /** 计划发行数量。 */
  quantity?: number
  /** 激活有效开始时间。 */
  activateValidFrom?: string
  /** 激活有效结束时间。 */
  activateValidTo?: string
  /** 运营备注。 */
  remark?: string
}
