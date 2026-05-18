import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { ListTransferOrdersQuery } from '@contracts/admin/transfers';
import { AdminAccessGuard } from '../auth/admin-access.guard';
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
}
