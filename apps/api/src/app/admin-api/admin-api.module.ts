import { Module } from '@nestjs/common';
import { AdminApiController } from './admin-api.controller';
import { CollectionCommentsModule } from '../../modules/admin/collection-comments/collection-comments.module';
import { CollectionsModule } from '../../modules/admin/collections/collections.module';
import { CollectionReviewsModule } from '../../modules/admin/collection-reviews/collection-reviews.module';
import { DashboardModule } from '../../modules/admin/dashboard/dashboard.module';
import { MembersModule } from '../../modules/admin/members/members.module';
import { NotificationsModule } from '../../modules/admin/notifications/notifications.module';
import { SystemModule } from '../../modules/admin/system/system.module';
import { TransfersModule } from '../../modules/admin/transfers/transfers.module';
import { ActivationCodesModule } from '../../modules/issuance/activation-codes/activation-codes.module';
import { IssuanceBatchesModule } from '../../modules/issuance/issuance-batches/issuance-batches.module';
import { SeriesModule } from '../../modules/issuance/series/series.module';

@Module({
  imports: [
    DashboardModule,
    SeriesModule,
    IssuanceBatchesModule,
    ActivationCodesModule,
    CollectionCommentsModule,
    CollectionsModule,
    CollectionReviewsModule,
    MembersModule,
    NotificationsModule,
    SystemModule,
    TransfersModule,
  ],
  controllers: [AdminApiController],
})
export class AdminApiModule {}
