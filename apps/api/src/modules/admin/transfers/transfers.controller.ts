import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type {
  CompleteTransferOrderParams,
  CompleteTransferOrderRequest,
  ExpireTransferOrderParams,
  ExpireTransferOrderRequest,
  GetTransferOrderHistoryParams,
  ListTransferOperationRecordsQuery,
  ListTransferOrdersQuery,
  RollbackTransferOrderParams,
  RollbackTransferOrderRequest,
  SyncTransferOrderOwnerParams,
  SyncTransferOrderOwnerRequest,
} from '@contracts/admin/transfers';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import type { AdminHttpRequest } from '../auth/admin-http.types';
import { ADMIN_PERMISSION_TRANSFERS_MANAGE } from '../auth/admin-permission-keys';
import { RequireAdminPermissions } from '../auth/admin-permissions.decorator';
import { TransfersService } from './transfers.service';

/**
 * 后台转让记录控制器。
 * 当前挂载在 `admin-api/transfers`，提供转让单分页查询。
 */
@Controller('admin-api/transfers')
@UseGuards(AdminAccessGuard)
@RequireAdminPermissions(ADMIN_PERMISSION_TRANSFERS_MANAGE)
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  /**
   * 查询后台转让记录列表。
   */
  @Get()
  async listTransferOrders(@Query() query: ListTransferOrdersQuery) {
    return this.transfersService.listTransferOrders(query);
  }

  /**
   * 查询转让运营处置累计概览。
   */
  @Get('operations/overview')
  async getTransferOperationsOverview() {
    return this.transfersService.getTransferOperationsOverview();
  }

  /**
   * 查询转让运营处置记录列表。
   */
  @Get('operations')
  async listTransferOperationRecords(
    @Query() query: ListTransferOperationRecordsQuery,
  ) {
    return this.transfersService.listTransferOperationRecords(query);
  }

  /**
   * 查询单条转让单的运营处置时间线。
   */
  @Get(':transferId/history')
  async getTransferOrderHistory(@Param() params: GetTransferOrderHistoryParams) {
    return this.transfersService.getTransferOrderHistory(params.transferId);
  }

  /**
   * 运营将一条已实质到账但仍停留待接收的转让补记为已完成。
   */
  @Post(':transferId/complete')
  async completeTransferOrder(
    @Param() params: CompleteTransferOrderParams,
    @Body() body: CompleteTransferOrderRequest,
    @Req() request: AdminHttpRequest,
  ) {
    return this.transfersService.completeTransferOrder(
      params.transferId,
      body,
      request.admin?.id ?? null,
    );
  }

  /**
   * 运营将一条已完成转让回滚为发起方持有。
   */
  @Post(':transferId/rollback')
  async rollbackTransferOrder(
    @Param() params: RollbackTransferOrderParams,
    @Body() body: RollbackTransferOrderRequest,
    @Req() request: AdminHttpRequest,
  ) {
    return this.transfersService.rollbackTransferOrder(
      params.transferId,
      body,
      request.admin?.id ?? null,
    );
  }

  /**
   * 运营手动释放一条超时未释放的待接收转让。
   */
  @Post(':transferId/expire')
  async expireTransferOrder(
    @Param() params: ExpireTransferOrderParams,
    @Body() body: ExpireTransferOrderRequest,
    @Req() request: AdminHttpRequest,
  ) {
    return this.transfersService.expireTransferOrder(
      params.transferId,
      body,
      request.admin?.id ?? null,
    );
  }

  /**
   * 运营修复一条已完成但归属未对齐的转让。
   */
  @Post(':transferId/sync-owner')
  async syncTransferOrderOwner(
    @Param() params: SyncTransferOrderOwnerParams,
    @Body() body: SyncTransferOrderOwnerRequest,
    @Req() request: AdminHttpRequest,
  ) {
    return this.transfersService.syncTransferOrderOwner(
      params.transferId,
      body,
      request.admin?.id ?? null,
    );
  }
}
