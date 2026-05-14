import { Module } from '@nestjs/common';
import { CollectionReviewsController } from './collection-reviews.controller';
import { CollectionReviewsService } from './collection-reviews.service';

/**
 * 藏品内容审核模块。
 */
@Module({
  controllers: [CollectionReviewsController],
  providers: [CollectionReviewsService],
  exports: [CollectionReviewsService],
})
export class CollectionReviewsModule {}
