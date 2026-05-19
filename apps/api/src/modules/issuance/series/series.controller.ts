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
import { AdminAccessGuard } from '../../admin/auth/admin-access.guard';
import {
  ADMIN_PERMISSION_ISSUANCE_SERIES,
  ADMIN_PERMISSION_ISSUANCE_SERIES_CREATE,
  ADMIN_PERMISSION_ISSUANCE_SERIES_TOGGLE_STATUS,
  ADMIN_PERMISSION_ISSUANCE_SERIES_UPDATE,
} from '../../admin/auth/admin-permission-keys';
import { RequireAdminPermissions } from '../../admin/auth/admin-permissions.decorator';
import type {
  CreateSeriesRequest,
  ListSeriesQuery,
  UpdateSeriesRequest,
  UpdateSeriesStatusRequest,
} from '@contracts/admin/series';
import { SeriesService } from './series.service';

/**
 * 系列管理控制器。
 * 当前挂载在后台接口边界下，对应 `admin-api/series`。
 */
@Controller('admin-api/series')
@UseGuards(AdminAccessGuard)
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  /**
   * 查询系列列表。
   */
  @Get()
  @RequireAdminPermissions(ADMIN_PERMISSION_ISSUANCE_SERIES)
  async listSeries(@Query() query: ListSeriesQuery) {
    return this.seriesService.listSeries(query);
  }

  /**
   * 查询系列详情。
   */
  @Get(':seriesId')
  @RequireAdminPermissions(ADMIN_PERMISSION_ISSUANCE_SERIES)
  async getSeriesById(@Param('seriesId') seriesId: string) {
    return this.seriesService.getSeriesById(seriesId);
  }

  /**
   * 创建系列。
   */
  @Post()
  @RequireAdminPermissions(ADMIN_PERMISSION_ISSUANCE_SERIES_CREATE)
  async createSeries(@Body() body: CreateSeriesRequest) {
    return this.seriesService.createSeries(body);
  }

  /**
   * 编辑系列。
   */
  @Patch(':seriesId')
  @RequireAdminPermissions(ADMIN_PERMISSION_ISSUANCE_SERIES_UPDATE)
  async updateSeries(
    @Param('seriesId') seriesId: string,
    @Body() body: UpdateSeriesRequest,
  ) {
    return this.seriesService.updateSeries(seriesId, body);
  }

  /**
   * 更新系列状态。
   */
  @Patch(':seriesId/status')
  @RequireAdminPermissions(ADMIN_PERMISSION_ISSUANCE_SERIES_TOGGLE_STATUS)
  async updateSeriesStatus(
    @Param('seriesId') seriesId: string,
    @Body() body: UpdateSeriesStatusRequest,
  ) {
    return this.seriesService.updateSeriesStatus(seriesId, body);
  }
}
