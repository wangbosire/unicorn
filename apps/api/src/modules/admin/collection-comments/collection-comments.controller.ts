import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type {
  ApproveCollectionCommentRequest,
  BlockCollectionCommentRequest,
  ListCollectionCommentReviewsQuery,
  ListCollectionCommentsQuery,
  RejectCollectionCommentRequest,
} from '@contracts/admin/collection-comments';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import { ADMIN_PERMISSION_COLLECTION_COMMENTS_MANAGE } from '../auth/admin-permission-keys';
import { RequireAdminPermissions } from '../auth/admin-permissions.decorator';
import { CollectionCommentsService } from './collection-comments.service';

/**
 * 后台评论治理控制器。
 * 当前挂载在 `admin-api/collection-comments`，提供评论列表、审核队列和人工审核动作。
 */
@Controller('admin-api/collection-comments')
@UseGuards(AdminAccessGuard)
@RequireAdminPermissions(ADMIN_PERMISSION_COLLECTION_COMMENTS_MANAGE)
export class CollectionCommentsController {
  constructor(
    private readonly collectionCommentsService: CollectionCommentsService,
  ) {}

  /**
   * 查询后台评论列表。
   */
  @Get()
  async listCollectionComments(@Query() query: ListCollectionCommentsQuery) {
    return this.collectionCommentsService.listCollectionComments(query);
  }

  /**
   * 查询后台评论审核队列。
   * 路由置于参数型动作前，避免误匹配。
   */
  @Get('reviews')
  async listCollectionCommentReviews(
    @Query() query: ListCollectionCommentReviewsQuery,
  ) {
    return this.collectionCommentsService.listCollectionCommentReviews(query);
  }

  /**
   * 人工通过评论审核。
   */
  @Post(':commentId/approve')
  async approveCollectionComment(
    @Param('commentId') commentId: string,
    @Body() body: ApproveCollectionCommentRequest,
  ) {
    return this.collectionCommentsService.approveCollectionComment(commentId, body);
  }

  /**
   * 人工驳回评论审核。
   */
  @Post(':commentId/reject')
  async rejectCollectionComment(
    @Param('commentId') commentId: string,
    @Body() body: RejectCollectionCommentRequest,
  ) {
    return this.collectionCommentsService.rejectCollectionComment(commentId, body);
  }

  /**
   * 屏蔽已公开或已通过审核的评论。
   */
  @Post(':commentId/block')
  async blockCollectionComment(
    @Param('commentId') commentId: string,
    @Body() body: BlockCollectionCommentRequest,
  ) {
    return this.collectionCommentsService.blockCollectionComment(commentId, body);
  }
}
