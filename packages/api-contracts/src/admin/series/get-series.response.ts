/**
 * 系列详情。
 * 与后台「系列详情」接口 data 字段对齐。
 */
export type SeriesDetail = {
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
  /** 创建时间戳，单位毫秒。 */
  createdAt: number
  /** 更新时间戳，单位毫秒。 */
  updatedAt: number
}
