import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../platform/prisma/prisma.module';
import { MemberAuthModule } from '../auth/member-auth.module';
import { MemberMessagesController } from './member-messages.controller';
import { MemberMessagesService } from './member-messages.service';

/**
 * 会员消息中心模块。
 */
@Module({
  imports: [PrismaModule, MemberAuthModule],
  controllers: [MemberMessagesController],
  providers: [MemberMessagesService],
  exports: [MemberMessagesService],
})
export class MemberMessagesModule {}
