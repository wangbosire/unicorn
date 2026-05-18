import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import type {
  GetCollectionContentParams,
  ListMyCollectionsQuery,
  SaveCollectionDraftRequest,
  SubmitCollectionContentRequest,
} from '@contracts/member/my-collections';
import { MyCollectionsService } from './my-collections.service';

/**
 * 我的藏品控制器。
 * 当前挂载在会员接口边界下，对应 `member-api/my/collections`。
 */
@Controller('member-api/my/collections')
export class MyCollectionsController {
  constructor(private readonly myCollectionsService: MyCollectionsService) {}

  /**
   * 查询当前会员名下藏品列表。
   * 当前兼容 x-member-id 和 mock bearer token，方便前后端并行联调。
   */
  @Get()
  async listMyCollections(
    @Headers('x-member-id') memberId: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Query() query: ListMyCollectionsQuery,
  ) {
    return this.myCollectionsService.listMyCollections(
      {
        memberId,
        authorization,
      },
      query,
    );
  }

  /**
   * 查询当前会员某个藏品详情。
   * 当前兼容 x-member-id 和 mock bearer token，方便前后端并行联调。
   */
  @Get(':collectionId')
  async getMyCollectionById(
    @Headers('x-member-id') memberId: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Param() params: GetCollectionContentParams,
  ) {
    return this.myCollectionsService.getMyCollectionById(
      {
        memberId,
        authorization,
      },
      params,
    );
  }

  /**
   * 查询当前会员某个藏品的可编辑内容版本。
   * 当前兼容 x-member-id 和 mock bearer token，方便前后端并行联调。
   */
  @Get(':collectionId/content')
  async getCollectionContent(
    @Headers('x-member-id') memberId: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Param() params: GetCollectionContentParams,
  ) {
    return this.myCollectionsService.getCollectionContent(
      {
        memberId,
        authorization,
      },
      params,
    );
  }

  /**
   * 保存当前会员某个藏品的内容草稿。
   * 当前兼容 x-member-id 和 mock bearer token，方便前后端并行联调。
   */
  @Post(':collectionId/content/drafts')
  async saveCollectionDraft(
    @Headers('x-member-id') memberId: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Param() params: GetCollectionContentParams,
    @Body() body: SaveCollectionDraftRequest,
  ) {
    return this.myCollectionsService.saveCollectionDraft(
      {
        memberId,
        authorization,
      },
      params,
      body,
    );
  }

  /**
   * 提交当前会员某个藏品的内容版本进入审核流程。
   * 当前兼容 x-member-id 和 mock bearer token，方便前后端并行联调。
   */
  @Post(':collectionId/content/submissions')
  async submitCollectionContent(
    @Headers('x-member-id') memberId: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Param() params: GetCollectionContentParams,
    @Body() body: SubmitCollectionContentRequest,
  ) {
    return this.myCollectionsService.submitCollectionContent(
      {
        memberId,
        authorization,
      },
      params,
      body,
    );
  }
}
