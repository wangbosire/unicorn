/**
 * 与后端 `MemberAuthService.buildMockAccessToken` 一致的 mock 令牌前缀（不含 `Bearer `）。
 */
export const MOCK_MEMBER_TOKEN_PREFIX = 'mock-member-token:'

/**
 * 从已存储的 accessToken 字符串中解析 mock 会员主键（支持带或不带 `Bearer ` 前缀）。
 * 非 mock 形态返回 `null`，由调用方决定是否回落到 `unicorn_member_id`。
 */
export function parseMemberIdFromMockAccessToken(token: string): string | null {
  const trimmed = token.trim()
  const withoutBearer = trimmed.startsWith('Bearer ') ? trimmed.slice(7).trim() : trimmed
  if (withoutBearer.startsWith(MOCK_MEMBER_TOKEN_PREFIX)) {
    const id = withoutBearer.slice(MOCK_MEMBER_TOKEN_PREFIX.length).trim()
    return id.length > 0 ? id : null
  }
  return null
}
