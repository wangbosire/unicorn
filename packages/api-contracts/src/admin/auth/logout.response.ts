/**
 * 后台退出登录返回结构。
 * 当前后端采用无状态 JWT，退出以客户端清理令牌为准，因此这里返回确认结果。
 */
export type AdminLogoutResponseData = {
  /** 是否已完成退出动作确认。 */
  success: true
}
