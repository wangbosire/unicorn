import { ApiError } from './api-error'

/**
 * 后台前端识别的成功响应壳。
 */
export type ApiSuccessResponse<TData> = {
  /** 成功响应固定返回 OK。 */
  code: 'OK'
  /** 成功响应固定返回 success。 */
  message: 'success'
  /** 业务响应数据。 */
  data: TData
}

/**
 * 后台前端识别的失败响应壳。
 */
export type ApiFailureResponse = {
  /** 业务错误码。 */
  code: string
  /** 错误信息。 */
  message: string
  /** 可选的结构化错误详情。 */
  details?: Record<string, unknown>
}

/**
 * 前后端统一 API 响应联合类型。
 */
export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiFailureResponse

/**
 * 判断是否为成功响应。
 */
export function isApiSuccessResponse<TData>(
  response: ApiResponse<TData>
): response is ApiSuccessResponse<TData> {
  return response.code === 'OK'
}

/**
 * 解包统一响应壳。
 * 成功时返回纯业务数据，失败时抛出 ApiError。
 */
export function unwrapApiResponse<TData>(response: ApiResponse<TData>): TData {
  if (isApiSuccessResponse(response)) {
    return response.data
  }

  throw new ApiError({
    code: response.code,
    message: response.message,
    details: response.details,
  })
}
