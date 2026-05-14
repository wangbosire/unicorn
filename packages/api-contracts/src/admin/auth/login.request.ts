/**
 * 后台登录请求。
 */
export type AdminLoginRequest = {
  /** 后台登录用户名。 */
  username: string
  /** 用户输入的原始密码。 */
  password: string
}
