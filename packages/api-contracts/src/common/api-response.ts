/**
 * 通用成功响应结构。
 * 后台、会员端和公开接口统一使用该包装形态。
 * data 为接口真正返回的业务载荷。
 */
export type ApiSuccessResponse<TData> = {
  /** 成功响应固定返回 OK。 */
  code: 'OK'
  /** 成功响应固定返回 success。 */
  message: 'success'
  /** 业务响应数据，具体结构由各接口自行定义。 */
  data: TData
}

/**
 * 通用失败响应结构。
 * code 用于前端程序化分支处理，message 用于日志或提示文案。
 * details 用于补充可程序化处理的上下文信息。
 */
export type ApiErrorResponse<
  TCode extends string = string,
  TDetails = Record<string, unknown>,
> = {
  /** 业务错误码，前端应优先基于该字段做分支判断。 */
  code: TCode
  /** 面向调试、日志或用户提示的错误信息。 */
  message: string
  /** 可选的结构化错误详情，适合承载字段级校验结果等上下文。 */
  details?: TDetails
}

/**
 * 通用接口响应联合类型。
 * 适合在 SDK、前端请求层或测试中描述完整的接口返回值。
 */
export type ApiResponse<TData, TCode extends string = string, TDetails = Record<string, unknown>> =
  | ApiSuccessResponse<TData>
  | ApiErrorResponse<TCode, TDetails>
