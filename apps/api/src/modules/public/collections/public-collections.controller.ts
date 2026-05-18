import { Controller, Get, Param } from '@nestjs/common';
import type { GetPublicCollectionParams } from '@contracts/public/collections';
import { PublicCollectionsService } from './public-collections.service';

/**
 * 公开展示控制器。
 * 挂载在 `public-api` 出口，无需会员登录态。
 */
@Controller('public-api/collections')
export class PublicCollectionsController {
  constructor(private readonly publicCollectionsService: PublicCollectionsService) {}

  /**
   * 读取单件藏品的公开展示快照。
   */
  @Get(':slug')
  async getPublicCollection(@Param() params: GetPublicCollectionParams) {
    return this.publicCollectionsService.getPublicCollectionBySlug(params.slug);
  }

  /**
   * 读取公开展示页统计摘要。
   */
  @Get(':slug/stats')
  async getPublicCollectionStats(@Param() params: GetPublicCollectionParams) {
    return this.publicCollectionsService.getPublicCollectionStatsBySlug(params.slug);
  }
}
