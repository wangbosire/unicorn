import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  GetNotificationDispatchRecordParams,
  GetNotificationDispatchHistoryParams,
  GetNotificationTemplateParams,
  ListNotificationFailureSummaryQuery,
  ListNotificationDispatchRecordsQuery,
  ListNotificationTemplatesQuery,
  RetryNotificationDispatchParams,
  UpdateNotificationTemplateStatusParams,
  UpdateNotificationTemplateStatusRequest,
  UpdateNotificationTemplateParams,
  UpsertNotificationTemplateRequest,
} from '@contracts/admin/notifications';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import { ADMIN_PERMISSION_NOTIFICATIONS_MANAGE } from '../auth/admin-permission-keys';
import { RequireAdminPermissions } from '../auth/admin-permissions.decorator';
import { NotificationsService } from './notifications.service';

/**
 * 后台通知中心控制器。
 * 挂载在 `admin-api/notifications`，提供通知总览与模板治理接口。
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

  /**
   * 查询通知派发记录列表。
   */
  @Get('dispatch-records')
  async listNotificationDispatchRecords(
    @Query() query: ListNotificationDispatchRecordsQuery,
  ) {
    return this.notificationsService.listNotificationDispatchRecords(query);
  }

  /**
   * 查询失败派发聚合视图。
   */
  @Get('failure-summary')
  async listNotificationFailureSummary(
    @Query() query: ListNotificationFailureSummaryQuery,
  ) {
    return this.notificationsService.listNotificationFailureSummary(query);
  }

  /**
   * 查询单条派发记录的重试历史。
   */
  @Get('dispatch-records/:dispatchRecordId/history')
  async getNotificationDispatchHistory(
    @Param() params: GetNotificationDispatchHistoryParams,
  ) {
    return this.notificationsService.getNotificationDispatchHistory(
      params.dispatchRecordId,
    );
  }

  /**
   * 查询单条派发记录详情。
   */
  @Get('dispatch-records/:dispatchRecordId')
  async getNotificationDispatchRecord(
    @Param() params: GetNotificationDispatchRecordParams,
  ) {
    return this.notificationsService.getNotificationDispatchRecord(
      params.dispatchRecordId,
    );
  }

  /**
   * 将一条失败派发重新入队重投。
   */
  @Post('dispatch-records/:dispatchRecordId/retry')
  async retryNotificationDispatch(@Param() params: RetryNotificationDispatchParams) {
    return this.notificationsService.retryNotificationDispatch(params.dispatchRecordId);
  }

  /**
   * 查询通知模板列表。
   */
  @Get('templates')
  async listNotificationTemplates(@Query() query: ListNotificationTemplatesQuery) {
    return this.notificationsService.listNotificationTemplates(query);
  }

  /**
   * 查询单个通知模板详情。
   */
  @Get('templates/:templateId')
  async getNotificationTemplate(@Param() params: GetNotificationTemplateParams) {
    return this.notificationsService.getNotificationTemplate(params.templateId);
  }

  /**
   * 新建通知模板并生成首个版本。
   */
  @Post('templates')
  async createNotificationTemplate(@Body() body: UpsertNotificationTemplateRequest) {
    return this.notificationsService.createNotificationTemplate(body);
  }

  /**
   * 更新通知模板并发布新版本。
   */
  @Patch('templates/:templateId')
  async updateNotificationTemplate(
    @Param() params: UpdateNotificationTemplateParams,
    @Body() body: UpsertNotificationTemplateRequest,
  ) {
    return this.notificationsService.updateNotificationTemplate(params.templateId, body);
  }

  /**
   * 更新通知模板启停状态。
   */
  @Patch('templates/:templateId/status')
  async updateNotificationTemplateStatus(
    @Param() params: UpdateNotificationTemplateStatusParams,
    @Body() body: UpdateNotificationTemplateStatusRequest,
  ) {
    return this.notificationsService.updateNotificationTemplateStatus(
      params.templateId,
      body,
    );
  }
}
