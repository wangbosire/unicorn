import { Global, Module } from '@nestjs/common';
import { AdminAccessGuard } from './admin-access.guard';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';

/**
 * 后台认证全局模块：提供登录、JWT 守卫供各 admin-api 控制器复用。
 */
@Global()
@Module({
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminAccessGuard],
  exports: [AdminAuthService, AdminAccessGuard],
})
export class AdminAuthModule {}
