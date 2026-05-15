import { DEFAULT_DEV_MEMBER_ID } from './default-dev-member'

/** 将会话来源枚举转为首页展示用短文案（与 `getMemberSessionSummary` 的 `sessionSource` 对齐）。 */
export function formatSessionSourceLabel(source: 'default' | 'token' | 'id_only'): string {
  switch (source) {
    case 'default':
      return `默认种子会员 ${DEFAULT_DEV_MEMBER_ID}`
    case 'token':
      return '已存储 accessToken（优先从 token 解析 memberId）'
    case 'id_only':
      return '仅存储 memberId（Bearer mock-member-token）'
  }
}
