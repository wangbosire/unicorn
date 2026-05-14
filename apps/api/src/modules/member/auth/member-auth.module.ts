import { Module } from '@nestjs/common';
import { MemberAuthController } from './member-auth.controller';
import { MemberContextService } from './member-context.service';
import { MemberAuthService } from './member-auth.service';

/**
 * 会员认证模块。
 */
@Module({
  controllers: [MemberAuthController],
  providers: [MemberContextService, MemberAuthService],
  exports: [MemberContextService],
})
export class MemberAuthModule {}
