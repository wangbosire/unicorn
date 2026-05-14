/**
 * 编辑系列请求。
 * 至少传一个可写字段，具体校验由服务端 zod 收口。
 */
export type UpdateSeriesRequest = {
  /** 系列名称。 */
  name?: string
  /** 系列描述。 */
  description?: string
}
