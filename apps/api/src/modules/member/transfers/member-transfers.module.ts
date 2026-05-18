import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../platform/prisma/prisma.module';
import { MemberAuthModule } from '../auth/member-auth.module';
import { MemberTransfersController } from './member-transfers.controller';
import { MemberTransfersService } from './member-transfers.service';

/**
 * 会员转让模块。
 */
@Module({
  imports: [PrismaModule, MemberAuthModule],
  controllers: [MemberTransfersController],
  providers: [MemberTransfersService],
  exports: [MemberTransfersService],
})
export class MemberTransfersModule {}
