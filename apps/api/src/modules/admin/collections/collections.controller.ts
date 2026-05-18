import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import type {
  ListCollectionsQuery,
  UpdateCollectionStatusRequest,
} from '@contracts/admin/collections';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import { ADMIN_PERMISSION_COLLECTIONS_MANAGE } from '../auth/admin-permission-keys';
import { RequireAdminPermissions } from '../auth/admin-permissions.decorator';
import { CollectionsService } from './collections.service';

/**
 * 后台藏品管理控制器。
 * 当前挂载在 `admin-api/collections`，供后台运营做查询与冻结治理。
 */
@Controller('admin-api/collections')
@UseGuards(AdminAccessGuard)
@RequireAdminPermissions(ADMIN_PERMISSION_COLLECTIONS_MANAGE)
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  /**
   * 分页查询藏品列表。
   */
  @Get()
  async listCollections(@Query() query: ListCollectionsQuery) {
    return this.collectionsService.listCollections(query);
  }

  /**
   * 查询单个藏品详情。
   */
  @Get(':collectionId')
  async getCollectionById(@Param('collectionId') collectionId: string) {
    return this.collectionsService.getCollectionById(collectionId);
  }

  /**
   * 更新藏品状态（冻结 / 恢复）。
   */
  @Patch(':collectionId/status')
  async updateCollectionStatus(
    @Param('collectionId') collectionId: string,
    @Body() body: UpdateCollectionStatusRequest,
  ) {
    return this.collectionsService.updateCollectionStatus(collectionId, body);
  }
}
