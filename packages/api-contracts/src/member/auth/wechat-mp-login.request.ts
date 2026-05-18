/**
 * 公众号登录请求。
 * 当前与小程序登录保持同一字段结构，后续可独立扩展。
 */
export type WechatMpLoginRequest = {
  /** 微信公众号登录临时 code。 */
  code: string
}
