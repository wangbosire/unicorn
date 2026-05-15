import Taro from '@tarojs/taro'
import type {
  WechatMiniappLoginRequest,
  WechatMiniappLoginResponseData,
} from '@contracts/member/auth'
import { resolveMemberApiBaseUrl } from '../../config/runtime'
import { DEFAULT_DEV_MEMBER_ID } from '../../lib/default-dev-member'
import {
  MOCK_MEMBER_TOKEN_PREFIX,
  parseMemberIdFromMockAccessToken,
} from '../../lib/member-mock-token'

export { DEFAULT_DEV_MEMBER_ID }

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

type StoredMemberSession = {
  memberId: string
  authorization: string
  /** 与请求头注入逻辑一致，用于首页联调展示。 */
  source: 'default' | 'token' | 'id_only'
}

function readStoredMemberSession(): StoredMemberSession {
  let memberId = DEFAULT_DEV_MEMBER_ID
  let authorization = `Bearer ${MOCK_MEMBER_TOKEN_PREFIX}${DEFAULT_DEV_MEMBER_ID}`
  let source: StoredMemberSession['source'] = 'default'

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
      source = 'token'
    } else if (typeof storedId === 'string' && storedId.trim()) {
      memberId = storedId.trim()
      authorization = `Bearer ${MOCK_MEMBER_TOKEN_PREFIX}${memberId}`
      source = 'id_only'
    }
  } catch {
    // 存储不可用时保持默认联调身份。
  }

  return { memberId, authorization, source }
}

/**
 * 读取当前将与 `requestMemberApi` 一并发送的会员上下文摘要（联调页展示用，不含令牌明文）。
 */
export function getMemberSessionSummary(): {
  memberId: string
  sessionSource: StoredMemberSession['source']
  memberApiBaseUrl: string
} {
  const s = readStoredMemberSession()
  return {
    memberId: s.memberId,
    sessionSource: s.source,
    memberApiBaseUrl: resolveMemberApiBaseUrl(),
  }
}

/**
 * 解析会员请求头：优先使用登录态写入的 accessToken；否则回落到 `DEFAULT_DEV_MEMBER_ID`。
 */
function resolveMemberAuthHeaders(): Record<string, string> {
  const s = readStoredMemberSession()
  return {
    'content-type': 'application/json',
    'x-member-id': s.memberId,
    authorization: s.authorization,
  }
}

function throwIfMemberApiFailed<T>(
  response: Taro.request.SuccessCallbackResult<ApiSuccessResponse<T> | ApiErrorResponse>
): T {
  if (response.statusCode === 404) {
    throw new MemberApiError('NOT_FOUND', '资源不存在或无权访问')
  }
  if (response.statusCode >= 400) {
    const body = response.data as ApiErrorResponse | undefined
    const message =
      body && typeof body.message === 'string' && body.message
        ? body.message
        : `请求失败（${response.statusCode}）`
    const code = body && typeof body.code === 'string' ? body.code : 'HTTP_ERROR'
    throw new MemberApiError(code, message)
  }
  const payload = response.data
  if (!payload || typeof payload !== 'object' || !('code' in payload)) {
    throw new MemberApiError('INVALID_RESPONSE', '响应格式异常')
  }
  if (payload.code !== 'OK') {
    const err = payload as ApiErrorResponse
    throw new MemberApiError(err.code, err.message || '请求失败')
  }
  return (payload as ApiSuccessResponse<T>).data
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
 * 清除登录态，恢复默认联调种子会员（`DEFAULT_DEV_MEMBER_ID`）。
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
