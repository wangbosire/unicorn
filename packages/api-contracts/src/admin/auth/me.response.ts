import type { AdminAuthUser } from './login.response'

/**
 * 获取当前后台登录用户返回结构。
 */
export type AdminGetMeResponseData = {
  /** 当前登录后台用户信息。 */
  user: AdminAuthUser
}
