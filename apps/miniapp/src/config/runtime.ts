import Taro from '@tarojs/taro'

/**
 * 本地联调默认 member-api 基地址（须含 Nest 全局前缀 `/api`）。
 * H5 在浏览器中运行时回落为当前站点同源 `/api`，以便与 Docker 网关或反代一致。
 */
function defaultMemberApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`
  }
  return 'http://127.0.0.1:3000/api'
}

/** 可在开发者工具中写入，便于指向测试环境而无需改代码。 */
export const MEMBER_API_BASE_URL_STORAGE_KEY = 'unicorn_member_api_base_url'

/**
 * 解析会员接口基地址。
 * 优先读取本地存储覆盖，便于联调；未设置时回落到默认值。
 */
export function resolveMemberApiBaseUrl(): string {
  try {
    const raw = Taro.getStorageSync(MEMBER_API_BASE_URL_STORAGE_KEY)
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
    }
  } catch {
    // 非小程序环境或存储不可用时忽略，使用默认基地址。
  }
  return defaultMemberApiBaseUrl()
}

/**
 * 小程序运行时配置（兼容旧引用；基地址以 resolveMemberApiBaseUrl 为准）。
 */
export const miniappRuntimeConfig = {
  get memberApiBaseUrl() {
    return resolveMemberApiBaseUrl()
  },
}
