/**
 * 创建发行批次请求。
 */
export type CreateIssuanceBatchRequest = {
  /** 所属系列主键。 */
  seriesId: string
  /** 批次名称。 */
  name: string
  /** 计划发行数量。 */
  quantity: number
  /** 激活有效开始时间，入参使用可被后端解析的时间字符串。 */
  activateValidFrom: string
  /** 激活有效结束时间，入参使用可被后端解析的时间字符串。 */
  activateValidTo: string
  /** 运营备注。 */
  remark?: string
}
