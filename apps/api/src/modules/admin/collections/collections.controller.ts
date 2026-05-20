import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import type {
  ListCollectionsQuery,
  UpdateCollectionStatusRequest,
} from '@contracts/admin/collections';
import { BizError } from '../../../common/http/biz-error';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import type { AdminHttpRequest } from '../auth/admin-http.types';
import {
  ADMIN_PERMISSION_COLLECTIONS_READ,
  ADMIN_PERMISSION_COLLECTIONS_TOGGLE_STATUS,
  ADMIN_PERMISSION_WILDCARD,
} from '../auth/admin-permission-keys';
import { CollectionsService } from './collections.service';

/**
 * 后台藏品管理控制器。
 * 当前挂载在 `admin-api/collections`，供后台运营做查询与冻结治理。
 */
@Controller('admin-api/collections')
@UseGuards(AdminAccessGuard)
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  /**
   * 分页查询藏品列表。
   */
  @Get()
  async listCollections(
    @Query() query: ListCollectionsQuery,
    @Req() request: AdminHttpRequest,
  ) {
    this.ensureAnyPermission(request, [ADMIN_PERMISSION_COLLECTIONS_READ]);
    return this.collectionsService.listCollections(query);
  }

  /**
   * 查询单个藏品详情。
   */
  @Get(':collectionId')
  async getCollectionById(
    @Param('collectionId') collectionId: string,
    @Req() request: AdminHttpRequest,
  ) {
    this.ensureAnyPermission(request, [ADMIN_PERMISSION_COLLECTIONS_READ]);
    return this.collectionsService.getCollectionById(collectionId);
  }

  /**
   * 更新藏品状态（冻结 / 恢复）。
   */
  @Patch(':collectionId/status')
  async updateCollectionStatus(
    @Param('collectionId') collectionId: string,
    @Body() body: UpdateCollectionStatusRequest,
    @Req() request: AdminHttpRequest,
  ) {
    this.ensureAnyPermission(request, [
      ADMIN_PERMISSION_COLLECTIONS_TOGGLE_STATUS,
    ]);
    return this.collectionsService.updateCollectionStatus(collectionId, body);
  }

  /**
   * 藏品列表仅按最新 action 权限点放行，不再兼容历史 manage 模式。
   */
  private ensureAnyPermission(
    request: AdminHttpRequest,
    permissionKeys: string[],
  ) {
    const currentPermissionKeys = request.admin?.permissionKeys ?? [];

    if (
      currentPermissionKeys.includes(ADMIN_PERMISSION_WILDCARD) ||
      permissionKeys.some((permissionKey) =>
        currentPermissionKeys.includes(permissionKey),
      )
    ) {
      return;
    }

    throw new BizError({
      code: 'ADMIN_AUTH_FORBIDDEN',
      message: 'insufficient admin permissions',
      status: 403,
    });
  }
}
