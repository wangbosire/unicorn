import axios, { AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth-store'
import { ApiError } from './api-error'
import { type ApiFailureResponse, unwrapApiResponse } from './api-response'

/**
 * 后台接口基础 client。
 * 统一处理认证头、响应壳解包和 BizError 到前端异常的转换。
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
})

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().auth.accessToken

  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => unwrapApiResponse(response.data),
  (error: unknown) => {
    if (error instanceof AxiosError) {
      const data = error.response?.data

      if (isApiFailureResponse(data)) {
        return Promise.reject(
          new ApiError({
            code: data.code,
            message: data.message,
            status: error.response?.status,
            details: data.details,
          })
        )
      }
    }

    return Promise.reject(error)
  }
)

/**
 * 判断响应体是否符合统一失败响应结构。
 */
function isApiFailureResponse(data: unknown): data is ApiFailureResponse {
  return (
    !!data &&
    typeof data === 'object' &&
    'code' in data &&
    typeof data.code === 'string' &&
    'message' in data &&
    typeof data.message === 'string'
  )
}
