/** 将会话来源枚举转为首页展示用短文案（与 `getMemberSessionSummary` 的 `sessionSource` 对齐）。 */
export function formatSessionSourceLabel(source: 'anonymous' | 'token'): string {
  switch (source) {
    case 'anonymous':
      return '未登录（需先微信登录）'
    case 'token':
      return '已存储 accessToken'
  }
}
