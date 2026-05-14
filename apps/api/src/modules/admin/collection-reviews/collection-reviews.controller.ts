import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type {
  ApproveCollectionReviewRequest,
  ListCollectionReviewsQuery,
} from '@contracts/admin/collection-reviews';
import { CollectionReviewsService } from './collection-reviews.service';

/**
 * 藏品内容审核控制器。
 * 当前挂载在后台接口边界下，对应 `admin-api/collection-reviews`。
 */
@Controller('admin-api/collection-reviews')
export class CollectionReviewsController {
  constructor(
    private readonly collectionReviewsService: CollectionReviewsService,
  ) {}

  /**
   * 查询藏品内容审核列表。
   */
  @Get()
  async listCollectionReviews(@Query() query: ListCollectionReviewsQuery) {
    return this.collectionReviewsService.listCollectionReviews(query);
  }

  /**
   * 人工通过藏品内容审核。
   */
  @Post(':reviewId/approve')
  async approveCollectionReview(
    @Param('reviewId') reviewId: string,
    @Body() body: ApproveCollectionReviewRequest,
  ) {
    return this.collectionReviewsService.approveCollectionReview(reviewId, body);
  }
}
