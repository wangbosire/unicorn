import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { MemberAuthService } from './member-auth.service';
import { WechatMiniappLoginRequestDto } from './dto/wechat-miniapp-login.request';

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
  async loginWithWechatMiniapp(@Body() body: WechatMiniappLoginRequestDto) {
    return this.memberAuthService.loginWithWechatMiniapp(body);
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
