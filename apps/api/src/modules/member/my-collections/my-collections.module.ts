import { Module } from '@nestjs/common';
import { MemberAuthModule } from '../auth/member-auth.module';
import { MyCollectionsController } from './my-collections.controller';
import { MyCollectionsService } from './my-collections.service';

/**
 * 我的藏品模块。
 */
@Module({
  imports: [MemberAuthModule],
  controllers: [MyCollectionsController],
  providers: [MyCollectionsService],
  exports: [MyCollectionsService],
})
export class MyCollectionsModule {}
