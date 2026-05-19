import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type {
  CreateIssuanceBatchRequest,
  ListIssuanceBatchesQuery,
  UpdateIssuanceBatchRequest,
  UpdateIssuanceBatchStatusRequest,
} from '@contracts/admin/issuance-batches';
import { AdminAccessGuard } from '../../admin/auth/admin-access.guard';
import {
  ADMIN_PERMISSION_ISSUANCE_BATCHES,
  ADMIN_PERMISSION_ISSUANCE_BATCHES_CREATE,
  ADMIN_PERMISSION_ISSUANCE_BATCHES_TOGGLE_STATUS,
  ADMIN_PERMISSION_ISSUANCE_BATCHES_UPDATE,
} from '../../admin/auth/admin-permission-keys';
import { RequireAdminPermissions } from '../../admin/auth/admin-permissions.decorator';
import { IssuanceBatchesService } from './issuance-batches.service';

/**
 * 发行批次管理接口。
 * 当前挂载在后台接口边界下，对应 `admin-api/issuance-batches`。
 */
@Controller('admin-api/issuance-batches')
@UseGuards(AdminAccessGuard)
export class IssuanceBatchesController {
  constructor(private readonly issuanceBatchesService: IssuanceBatchesService) {}

  /**
   * 查询发行批次列表。
   */
  @Get()
  @RequireAdminPermissions(ADMIN_PERMISSION_ISSUANCE_BATCHES)
  listIssuanceBatches(@Query() query: ListIssuanceBatchesQuery) {
    return this.issuanceBatchesService.listIssuanceBatches(query);
  }

  /**
   * 查询发行批次详情。
   */
  @Get(':batchId')
  @RequireAdminPermissions(ADMIN_PERMISSION_ISSUANCE_BATCHES)
  getIssuanceBatch(@Param('batchId') batchId: string) {
    return this.issuanceBatchesService.getIssuanceBatchById(batchId);
  }

  /**
   * 创建发行批次。
   */
  @Post()
  @RequireAdminPermissions(ADMIN_PERMISSION_ISSUANCE_BATCHES_CREATE)
  createIssuanceBatch(@Body() body: CreateIssuanceBatchRequest) {
    return this.issuanceBatchesService.createIssuanceBatch(body);
  }

  /**
   * 编辑发行批次。
   */
  @Patch(':batchId')
  @RequireAdminPermissions(ADMIN_PERMISSION_ISSUANCE_BATCHES_UPDATE)
  updateIssuanceBatch(
    @Param('batchId') batchId: string,
    @Body() body: UpdateIssuanceBatchRequest,
  ) {
    return this.issuanceBatchesService.updateIssuanceBatch(batchId, body);
  }

  /**
   * 更新发行批次状态。
   */
  @Patch(':batchId/status')
  @RequireAdminPermissions(ADMIN_PERMISSION_ISSUANCE_BATCHES_TOGGLE_STATUS)
  updateIssuanceBatchStatus(
    @Param('batchId') batchId: string,
    @Body() body: UpdateIssuanceBatchStatusRequest,
  ) {
    return this.issuanceBatchesService.updateIssuanceBatchStatus(batchId, body);
  }
}
