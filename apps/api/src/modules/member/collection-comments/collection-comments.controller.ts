import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import type {
  CreateCollectionCommentRequest,
  ReplyCollectionCommentParams,
  ReplyCollectionCommentRequest,
} from '@contracts/member/collection-comments';
import { CollectionCommentsService } from './collection-comments.service';

/**
 * 会员评论控制器。
 * 当前挂载在 `member-api/collection-comments`，提供发表评论与二级回复能力。
 */
@Controller('member-api/collection-comments')
export class CollectionCommentsController {
  constructor(
    private readonly collectionCommentsService: CollectionCommentsService,
  ) {}

  /**
   * 发表评论。
   * 当前要求携带 Bearer access token。
   */
  @Post()
  async createCollectionComment(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: CreateCollectionCommentRequest,
  ) {
    return this.collectionCommentsService.createCollectionComment(
      {
        authorization,
      },
      body,
    );
  }

  /**
   * 发表二级回复。
   * 当前要求携带 Bearer access token。
   */
  @Post(':commentId/replies')
  async replyCollectionComment(
    @Headers('authorization') authorization: string | undefined,
    @Param() params: ReplyCollectionCommentParams,
    @Body() body: ReplyCollectionCommentRequest,
  ) {
    return this.collectionCommentsService.replyCollectionComment(
      {
        authorization,
      },
      params,
      body,
    );
  }
}
