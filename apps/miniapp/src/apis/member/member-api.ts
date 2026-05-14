import Taro from '@tarojs/taro'

type ApiSuccessResponse<T> = {
  code: 'OK'
  message: string
  data: T
}

type ApiErrorResponse = {
  code: string
  message: string
}

type MemberApiRequestOptions<TData> = {
  path: string
  method: 'GET' | 'POST'
  data?: TData
}

const MEMBER_API_BASE_URL = 'http://127.0.0.1:3000'

/**
 * 会员接口请求封装。
 * 当前统一注入联调阶段的 mock 会员身份，后续接入真实登录时只需替换这里。
 */
export async function requestMemberApi<TResponse, TData = unknown>(
  options: MemberApiRequestOptions<TData>
): Promise<TResponse> {
  const response = await Taro.request<ApiSuccessResponse<TResponse> | ApiErrorResponse>({
    url: `${MEMBER_API_BASE_URL}${options.path}`,
    method: options.method,
    header: {
      'content-type': 'application/json',
      'x-member-id': 'mem_1',
      authorization: 'Bearer mock-member-token:mem_1',
    },
    data: options.data,
  })

  if (response.statusCode >= 400 || response.data.code !== 'OK') {
    const error = response.data as ApiErrorResponse
    throw new MemberApiError(error.code, error.message || '请求失败')
  }

  return (response.data as ApiSuccessResponse<TResponse>).data
}

/**
 * 会员接口错误。
 * 保留后端错误码，方便页面侧按业务场景映射文案。
 */
export class MemberApiError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'MemberApiError'
    this.code = code
  }
}
