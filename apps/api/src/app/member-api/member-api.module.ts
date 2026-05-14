import { Module } from '@nestjs/common';
import { MemberApiController } from './member-api.controller';
import { MemberAuthModule } from '../../modules/member/auth/member-auth.module';
import { CollectionActivationModule } from '../../modules/member/collection-activation/collection-activation.module';
import { MyCollectionsModule } from '../../modules/member/my-collections/my-collections.module';

@Module({
  imports: [MemberAuthModule, CollectionActivationModule, MyCollectionsModule],
  controllers: [MemberApiController],
})
export class MemberApiModule {}
