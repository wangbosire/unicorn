import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { AdminLoginRequest } from '@contracts/admin/auth';
import { BizError } from '../../../common/http/biz-error';
import { AdminAccessGuard } from './admin-access.guard';
import { AdminAuthService } from './admin-auth.service';
import type { AdminHttpRequest } from './admin-http.types';

/**
 * 后台认证控制器。
 * 挂载在 `admin-api/auth` 下；登录接口公开，其余需携带 JWT。
 */
@Controller('admin-api/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  /**
   * 用户名密码登录。
   */
  @Post('login')
  async login(@Body() body: AdminLoginRequest) {
    return this.adminAuthService.login(body);
  }

  /**
   * 获取当前登录后台用户（含权限点，用于菜单裁剪）。
   */
  @Get('me')
  @UseGuards(AdminAccessGuard)
  async me(@Req() request: AdminHttpRequest) {
    const admin = request.admin;

    if (!admin) {
      throw new BizError({
        code: 'INTERNAL_ERROR',
        message: 'admin context missing after AdminAccessGuard',
        status: 500,
      });
    }

    return this.adminAuthService.buildMeResponseHydrated(admin);
  }
}
