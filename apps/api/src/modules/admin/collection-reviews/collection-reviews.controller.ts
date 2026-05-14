import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type {
  ApproveCollectionReviewRequest,
  ListCollectionReviewsQuery,
} from '@contracts/admin/collection-reviews';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import { ADMIN_PERMISSION_COLLECTION_REVIEWS_MANAGE } from '../auth/admin-permission-keys';
import { RequireAdminPermissions } from '../auth/admin-permissions.decorator';
import { CollectionReviewsService } from './collection-reviews.service';

/**
 * 藏品内容审核控制器。
 * 当前挂载在后台接口边界下，对应 `admin-api/collection-reviews`。
 */
@Controller('admin-api/collection-reviews')
@UseGuards(AdminAccessGuard)
@RequireAdminPermissions(ADMIN_PERMISSION_COLLECTION_REVIEWS_MANAGE)
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
