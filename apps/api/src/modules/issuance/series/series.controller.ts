import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateSeriesRequestDto } from './dto/create-series.request';
import { ListSeriesQueryDto } from './dto/list-series.query';
import { UpdateSeriesRequestDto } from './dto/update-series.request';
import { UpdateSeriesStatusRequestDto } from './dto/update-series-status.request';
import { SeriesService } from './series.service';

/**
 * 系列管理控制器。
 * 当前挂载在后台接口边界下，对应 `admin-api/series`。
 */
@Controller('admin-api/series')
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  /**
   * 查询系列列表。
   */
  @Get()
  async listSeries(@Query() query: ListSeriesQueryDto) {
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
  async createSeries(@Body() body: CreateSeriesRequestDto) {
    return this.seriesService.createSeries(body);
  }

  /**
   * 编辑系列。
   */
  @Patch(':seriesId')
  async updateSeries(
    @Param('seriesId') seriesId: string,
    @Body() body: UpdateSeriesRequestDto,
  ) {
    return this.seriesService.updateSeries(seriesId, body);
  }

  /**
   * 更新系列状态。
   */
  @Patch(':seriesId/status')
  async updateSeriesStatus(
    @Param('seriesId') seriesId: string,
    @Body() body: UpdateSeriesStatusRequestDto,
  ) {
    return this.seriesService.updateSeriesStatus(seriesId, body);
  }
}
