/**
 * 创建系列返回结构。
 */
export type CreateSeriesResponseData = {
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
}
