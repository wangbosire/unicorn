import { Module } from '@nestjs/common';
import { MemberApiController } from './member-api.controller';
import { MemberAuthModule } from '../../modules/member/auth/member-auth.module';
import { CollectionActivationModule } from '../../modules/member/collection-activation/collection-activation.module';
import { CollectionCommentsModule } from '../../modules/member/collection-comments/collection-comments.module';
import { MemberMessagesModule } from '../../modules/member/messages/member-messages.module';
import { MemberTransfersModule } from '../../modules/member/transfers/member-transfers.module';
import { MyCollectionsModule } from '../../modules/member/my-collections/my-collections.module';

@Module({
  imports: [
    MemberAuthModule,
    CollectionActivationModule,
    MyCollectionsModule,
    CollectionCommentsModule,
    MemberMessagesModule,
    MemberTransfersModule,
  ],
  controllers: [MemberApiController],
})
export class MemberApiModule {}
