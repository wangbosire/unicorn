import { Controller, Get, Param } from '@nestjs/common';
import type { GetPublicCollectionParams } from '@contracts/public/collections';
import { PublicCollectionCommentsService } from './public-collection-comments.service';

/**
 * 公开评论控制器。
 * 当前挂载在 `public-api/collections/:slug/comments`。
 */
@Controller('public-api/collections')
export class PublicCollectionCommentsController {
  constructor(
    private readonly publicCollectionCommentsService: PublicCollectionCommentsService,
  ) {}

  /**
   * 读取公开评论列表。
   */
  @Get(':slug/comments')
  async listPublicCollectionComments(@Param() params: GetPublicCollectionParams) {
    return this.publicCollectionCommentsService.listPublicCollectionCommentsBySlug(
      params.slug,
    );
  }
}
