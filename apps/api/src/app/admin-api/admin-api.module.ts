import { Module } from '@nestjs/common';
import { AdminApiController } from './admin-api.controller';
import { CollectionReviewsModule } from '../../modules/admin/collection-reviews/collection-reviews.module';
import { ActivationCodesModule } from '../../modules/issuance/activation-codes/activation-codes.module';
import { IssuanceBatchesModule } from '../../modules/issuance/issuance-batches/issuance-batches.module';
import { SeriesModule } from '../../modules/issuance/series/series.module';

@Module({
  imports: [
    SeriesModule,
    IssuanceBatchesModule,
    ActivationCodesModule,
    CollectionReviewsModule,
  ],
  controllers: [AdminApiController],
})
export class AdminApiModule {}
