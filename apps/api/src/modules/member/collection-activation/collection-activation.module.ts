import { Module } from '@nestjs/common';
import { MemberAuthModule } from '../auth/member-auth.module';
import { CollectionActivationController } from './collection-activation.controller';
import { CollectionActivationService } from './collection-activation.service';

/**
 * 会员激活藏品模块。
 */
@Module({
  imports: [MemberAuthModule],
  controllers: [CollectionActivationController],
  providers: [CollectionActivationService],
  exports: [CollectionActivationService],
})
export class CollectionActivationModule {}
