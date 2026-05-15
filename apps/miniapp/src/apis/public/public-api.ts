import Taro from '@tarojs/taro'
import { resolveMemberApiBaseUrl } from '../../config/runtime'

type ApiSuccessResponse<T> = {
  code: 'OK'
  message: string
  data: T
}

type ApiErrorResponse = {
  code: string
  message: string
}

function throwIfPublicApiFailed<T>(
  response: Taro.request.SuccessCallbackResult<ApiSuccessResponse<T> | ApiErrorResponse>
): T {
  if (response.statusCode === 404) {
    throw new PublicApiError('NOT_FOUND', '该藏品未公开或不存在')
  }
  if (response.statusCode >= 400) {
    const body = response.data as ApiErrorResponse | undefined
    const message =
      body && typeof body.message === 'string' && body.message
        ? body.message
        : `请求失败（${response.statusCode}）`
    const code = body && typeof body.code === 'string' ? body.code : 'HTTP_ERROR'
    throw new PublicApiError(code, message)
  }
  if (!response.data || typeof response.data !== 'object') {
    throw new PublicApiError('INVALID_RESPONSE', '响应格式异常')
  }
  if (response.data.code !== 'OK') {
    const error = response.data as ApiErrorResponse
    throw new PublicApiError(error.code, error.message || '请求失败')
  }
  return (response.data as ApiSuccessResponse<T>).data
}

/**
 * 公开展示等无需会员鉴权的接口请求（与 member-api 共用 `/api` 基地址）。
 */
export async function requestPublicApi<TResponse>(options: {
  path: string
  method: 'GET'
}): Promise<TResponse> {
  const baseUrl = resolveMemberApiBaseUrl()
  const response = await Taro.request<ApiSuccessResponse<TResponse> | ApiErrorResponse>({
    url: `${baseUrl}${options.path}`,
    method: options.method,
    header: { 'content-type': 'application/json' },
  })
  return throwIfPublicApiFailed<TResponse>(response)
}

export class PublicApiError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'PublicApiError'
    this.code = code
  }
}
