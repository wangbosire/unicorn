import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import { ADMIN_PERMISSION_NOTIFICATIONS_MANAGE } from '../auth/admin-permission-keys';
import { RequireAdminPermissions } from '../auth/admin-permissions.decorator';
import { NotificationsService } from './notifications.service';

/**
 * 后台通知中心控制器。
 * 当前挂载在 `admin-api/notifications`，提供通知摘要查询。
 */
@Controller('admin-api/notifications')
@UseGuards(AdminAccessGuard)
@RequireAdminPermissions(ADMIN_PERMISSION_NOTIFICATIONS_MANAGE)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * 读取通知中心总览。
   */
  @Get('overview')
  async getNotificationsOverview() {
    return this.notificationsService.getNotificationsOverview();
  }
}
