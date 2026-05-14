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
import { ADMIN_PERMISSION_ISSUANCE_SERIES } from '../../admin/auth/admin-permission-keys';
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
@RequireAdminPermissions(ADMIN_PERMISSION_ISSUANCE_SERIES)
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  /**
   * 查询系列列表。
   */
  @Get()
  async listSeries(@Query() query: ListSeriesQuery) {
    return this.seriesService.listSeries(query);
  }

  /**
   * 查询系列详情。
   */
  @Get(':seriesId')
  async getSeriesById(@Param('seriesId') seriesId: string) {
    return this.seriesService.getSeriesById(seriesId);
  }

  /**
   * 创建系列。
   */
  @Post()
  async createSeries(@Body() body: CreateSeriesRequest) {
    return this.seriesService.createSeries(body);
  }

  /**
   * 编辑系列。
   */
  @Patch(':seriesId')
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
  async updateSeriesStatus(
    @Param('seriesId') seriesId: string,
    @Body() body: UpdateSeriesStatusRequest,
  ) {
    return this.seriesService.updateSeriesStatus(seriesId, body);
  }
}
