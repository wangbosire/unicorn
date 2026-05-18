import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import { ADMIN_PERMISSION_DASHBOARD_READ } from '../auth/admin-permission-keys';
import { RequireAdminPermissions } from '../auth/admin-permissions.decorator';
import { DashboardService } from './dashboard.service';

/**
 * 后台仪表盘控制器。
 * 当前挂载在 `admin-api/dashboard`，提供首页总览统计。
 */
@Controller('admin-api/dashboard')
@UseGuards(AdminAccessGuard)
@RequireAdminPermissions(ADMIN_PERMISSION_DASHBOARD_READ)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * 获取后台首页总览统计。
   */
  @Get('overview')
  async getDashboardOverview() {
    return this.dashboardService.getDashboardOverview();
  }
}
