import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type {
  ApproveCollectionReviewRequest,
  ListCollectionReviewHistoryQuery,
  ListCollectionReviewsQuery,
  RejectCollectionReviewRequest,
  TakedownPublishedContentVersionRequest,
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
   * 按藏品编号（及可选内容版本）查询审核轨迹（时间升序）。
   * 路由需置于参数型 `GET :id` 之前，避免被误匹配。
   */
  @Get('history')
  async listCollectionReviewHistory(@Query() query: ListCollectionReviewHistoryQuery) {
    return this.collectionReviewsService.listCollectionReviewHistory(query);
  }

  /**
   * 查询藏品内容审核列表。
   */
  @Get()
  async listCollectionReviews(@Query() query: ListCollectionReviewsQuery) {
    return this.collectionReviewsService.listCollectionReviews(query);
  }

  /**
   * 运营下架：将已公开发布的已通过内容版本标记为 `TAKEDOWN`。
   * 路由需置于 `:reviewId/*` 之前，避免 `reviewId` 误匹配 `content-versions`。
   */
  @Post('content-versions/:contentVersionId/takedown')
  async takedownPublishedContentVersion(
    @Param('contentVersionId') contentVersionId: string,
    @Body() body: TakedownPublishedContentVersionRequest,
  ) {
    return this.collectionReviewsService.takedownPublishedContentVersion(contentVersionId, body);
  }

  /**
   * 人工驳回藏品内容审核。
   */
  @Post(':reviewId/reject')
  async rejectCollectionReview(
    @Param('reviewId') reviewId: string,
    @Body() body: RejectCollectionReviewRequest,
  ) {
    return this.collectionReviewsService.rejectCollectionReview(reviewId, body);
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
