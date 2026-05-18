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
   * 当前要求携带 Bearer access token。
   */
  @Get()
  async listMyCollections(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: ListMyCollectionsQuery,
  ) {
    return this.myCollectionsService.listMyCollections(
      {
        authorization,
      },
      query,
    );
  }

  /**
   * 查询当前会员某个藏品详情。
   * 当前要求携带 Bearer access token。
   */
  @Get(':collectionId')
  async getMyCollectionById(
    @Headers('authorization') authorization: string | undefined,
    @Param() params: GetCollectionContentParams,
  ) {
    return this.myCollectionsService.getMyCollectionById(
      {
        authorization,
      },
      params,
    );
  }

  /**
   * 查询当前会员某个藏品的可编辑内容版本。
   * 当前要求携带 Bearer access token。
   */
  @Get(':collectionId/content')
  async getCollectionContent(
    @Headers('authorization') authorization: string | undefined,
    @Param() params: GetCollectionContentParams,
  ) {
    return this.myCollectionsService.getCollectionContent(
      {
        authorization,
      },
      params,
    );
  }

  /**
   * 保存当前会员某个藏品的内容草稿。
   * 当前要求携带 Bearer access token。
   */
  @Post(':collectionId/content/drafts')
  async saveCollectionDraft(
    @Headers('authorization') authorization: string | undefined,
    @Param() params: GetCollectionContentParams,
    @Body() body: SaveCollectionDraftRequest,
  ) {
    return this.myCollectionsService.saveCollectionDraft(
      {
        authorization,
      },
      params,
      body,
    );
  }

  /**
   * 提交当前会员某个藏品的内容版本进入审核流程。
   * 当前要求携带 Bearer access token。
   */
  @Post(':collectionId/content/submissions')
  async submitCollectionContent(
    @Headers('authorization') authorization: string | undefined,
    @Param() params: GetCollectionContentParams,
    @Body() body: SubmitCollectionContentRequest,
  ) {
    return this.myCollectionsService.submitCollectionContent(
      {
        authorization,
      },
      params,
      body,
    );
  }
}
