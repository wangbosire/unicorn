import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import type { WechatMiniappLoginRequest, WechatMpLoginRequest } from '@contracts/member/auth';
import { MemberAuthService } from './member-auth.service';

/**
 * 会员认证控制器。
 * 当前挂载在会员接口边界下，对应 `member-api/auth`。
 */
@Controller('member-api/auth')
export class MemberAuthController {
  constructor(private readonly memberAuthService: MemberAuthService) {}

  /**
   * 微信小程序登录。
   * 当前返回正式 member access token。
   */
  @Post('wechat-miniapp')
  async loginWithWechatMiniapp(@Body() body: WechatMiniappLoginRequest) {
    return this.memberAuthService.loginWithWechatMiniapp(body);
  }

  /**
   * 微信公众号登录。
   * 当前与小程序登录共享账号归并和 JWT 签发逻辑，仅区分渠道绑定类型。
   */
  @Post('wechat-mp')
  async loginWithWechatMp(@Body() body: WechatMpLoginRequest) {
    return this.memberAuthService.loginWithWechatMp(body);
  }

  /**
   * 获取当前会员信息。
   * 当前要求携带登录接口返回的 Bearer access token。
   */
  @Get('me')
  async getCurrentMember(@Headers('authorization') authorization: string | undefined) {
    return this.memberAuthService.getCurrentMember({
      authorization,
    });
  }
}
