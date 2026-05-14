import Taro from '@tarojs/taro'
import type {
  WechatMiniappLoginRequest,
  WechatMiniappLoginResponseData,
} from '@contracts/member/auth'
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

type MemberApiRequestOptions<TData> = {
  path: string
  method: 'GET' | 'POST'
  data?: TData
}

/** 可在开发者工具中写入，覆盖默认联调会员主键（与 authorization 需一致）。 */
export const MEMBER_ID_STORAGE_KEY = 'unicorn_member_id'

/**
 * 登录成功后写入的访问令牌（与后端 `MemberAuthService.buildMockAccessToken` 一致，形如 `mock-member-token:<memberId>`）。
 * 存在时优先于仅写 `unicorn_member_id` 的联调方式。
 */
export const MEMBER_ACCESS_TOKEN_STORAGE_KEY = 'unicorn_member_access_token'

const MOCK_MEMBER_TOKEN_PREFIX = 'mock-member-token:'

function parseMemberIdFromMockAccessToken(token: string): string | null {
  const trimmed = token.trim()
  const withoutBearer = trimmed.startsWith('Bearer ') ? trimmed.slice(7).trim() : trimmed
  if (withoutBearer.startsWith(MOCK_MEMBER_TOKEN_PREFIX)) {
    const id = withoutBearer.slice(MOCK_MEMBER_TOKEN_PREFIX.length).trim()
    return id.length > 0 ? id : null
  }
  return null
}

/**
 * 解析会员请求头：优先使用登录态写入的 accessToken；否则回落到默认种子会员 mem_1。
 */
function resolveMemberAuthHeaders(): Record<string, string> {
  let memberId = 'mem_1'
  let authorization = `Bearer ${MOCK_MEMBER_TOKEN_PREFIX}mem_1`

  try {
    const storedToken = Taro.getStorageSync(MEMBER_ACCESS_TOKEN_STORAGE_KEY)
    const storedId = Taro.getStorageSync(MEMBER_ID_STORAGE_KEY)

    if (typeof storedToken === 'string' && storedToken.trim()) {
      const raw = storedToken.trim()
      authorization = raw.startsWith('Bearer ') ? raw : `Bearer ${raw}`
      const fromToken = parseMemberIdFromMockAccessToken(raw)
      if (fromToken) {
        memberId = fromToken
      } else if (typeof storedId === 'string' && storedId.trim()) {
        memberId = storedId.trim()
      }
    } else if (typeof storedId === 'string' && storedId.trim()) {
      memberId = storedId.trim()
      authorization = `Bearer ${MOCK_MEMBER_TOKEN_PREFIX}${memberId}`
    }
  } catch {
    // 存储不可用时保持默认联调身份。
  }

  return {
    'content-type': 'application/json',
    'x-member-id': memberId,
    authorization,
  }
}

function throwIfMemberApiFailed<T>(
  response: Taro.request.SuccessCallbackResult<ApiSuccessResponse<T> | ApiErrorResponse>
): T {
  if (response.statusCode >= 400 || response.data.code !== 'OK') {
    const error = response.data as ApiErrorResponse
    throw new MemberApiError(error.code, error.message || '请求失败')
  }
  return (response.data as ApiSuccessResponse<T>).data
}

/**
 * 无鉴权上下文的会员域请求（仅用于登录等入口）。
 */
async function requestMemberApiPublic<TResponse, TData = unknown>(
  options: MemberApiRequestOptions<TData>
): Promise<TResponse> {
  const baseUrl = resolveMemberApiBaseUrl()
  const response = await Taro.request<ApiSuccessResponse<TResponse> | ApiErrorResponse>({
    url: `${baseUrl}${options.path}`,
    method: options.method,
    header: { 'content-type': 'application/json' },
    data: options.data,
  })
  return throwIfMemberApiFailed<TResponse>(response)
}

/**
 * 微信小程序 `code` 换会员会话（后端当前为联调映射方案，返回 mock access token）。
 */
export async function loginWechatMiniapp(
  code: string
): Promise<WechatMiniappLoginResponseData> {
  const payload = { code } satisfies WechatMiniappLoginRequest
  return requestMemberApiPublic<WechatMiniappLoginResponseData, WechatMiniappLoginRequest>({
    path: '/member-api/auth/wechat-miniapp',
    method: 'POST',
    data: payload,
  })
}

/**
 * 持久化会员会话，供后续 `requestMemberApi` 自动注入请求头。
 */
export function persistMemberSession(accessToken: string, memberId: string): void {
  try {
    Taro.setStorageSync(MEMBER_ACCESS_TOKEN_STORAGE_KEY, accessToken.trim())
    Taro.setStorageSync(MEMBER_ID_STORAGE_KEY, memberId.trim())
  } catch {
    // 存储失败时由调用方提示；不在此处抛错以免打断 UI。
  }
}

/**
 * 清除登录态，恢复默认联调种子会员 mem_1。
 */
export function clearMemberSession(): void {
  try {
    Taro.removeStorageSync(MEMBER_ACCESS_TOKEN_STORAGE_KEY)
    Taro.removeStorageSync(MEMBER_ID_STORAGE_KEY)
  } catch {
    // ignore
  }
}

/**
 * 会员接口请求封装。
 * 默认注入联调阶段会员上下文；支持登录态与本地存储覆盖。
 */
export async function requestMemberApi<TResponse, TData = unknown>(
  options: MemberApiRequestOptions<TData>
): Promise<TResponse> {
  const baseUrl = resolveMemberApiBaseUrl()
  const response = await Taro.request<ApiSuccessResponse<TResponse> | ApiErrorResponse>({
    url: `${baseUrl}${options.path}`,
    method: options.method,
    header: resolveMemberAuthHeaders(),
    data: options.data,
  })
  return throwIfMemberApiFailed<TResponse>(response)
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
