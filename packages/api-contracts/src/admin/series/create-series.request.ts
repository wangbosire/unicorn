/**
 * 创建系列请求。
 */
export type CreateSeriesRequest = {
  /** 系列名称，应在运营语义上保持唯一。 */
  name: string
  /** 系列描述。 */
  description: string
}
