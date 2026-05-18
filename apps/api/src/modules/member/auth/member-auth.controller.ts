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
   * 当前返回 mock token，用于初始化阶段的前后端联调。
   */
  @Post('wechat-miniapp')
  async loginWithWechatMiniapp(@Body() body: WechatMiniappLoginRequest) {
    return this.memberAuthService.loginWithWechatMiniapp(body);
  }

  /**
   * 微信公众号登录。
   * 当前与小程序登录共享账号归并和 mock token 逻辑，仅区分渠道绑定类型。
   */
  @Post('wechat-mp')
  async loginWithWechatMp(@Body() body: WechatMpLoginRequest) {
    return this.memberAuthService.loginWithWechatMp(body);
  }

  /**
   * 获取当前会员信息。
   * 当前优先读取 x-member-id，也支持读取登录接口返回的 mock bearer token。
   */
  @Get('me')
  async getCurrentMember(
    @Headers('x-member-id') memberId: string | undefined,
    @Headers('authorization') authorization: string | undefined,
  ) {
    return this.memberAuthService.getCurrentMember({
      memberId,
      authorization,
    });
  }
}
