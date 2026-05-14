/**
 * 微信小程序登录请求。
 * 当前仅使用前端传入的临时 code 构造本地联调用身份。
 */
export class WechatMiniappLoginRequestDto {
  /** 微信小程序登录临时 code。 */
  code!: string;
}
