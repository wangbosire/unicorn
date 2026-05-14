import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateIssuanceBatchRequestDto } from './dto/create-issuance-batch.request';
import { ListIssuanceBatchesQueryDto } from './dto/list-issuance-batches.query';
import { UpdateIssuanceBatchRequestDto } from './dto/update-issuance-batch.request';
import { UpdateIssuanceBatchStatusRequestDto } from './dto/update-issuance-batch-status.request';
import { IssuanceBatchesService } from './issuance-batches.service';

/**
 * 发行批次管理控制器。
 * 当前挂载在后台接口边界下，对应 `admin-api/issuance-batches`。
 */
@Controller('admin-api/issuance-batches')
export class IssuanceBatchesController {
  constructor(private readonly issuanceBatchesService: IssuanceBatchesService) {}

  /**
   * 查询发行批次列表。
   */
  @Get()
  async listIssuanceBatches(@Query() query: ListIssuanceBatchesQueryDto) {
    return this.issuanceBatchesService.listIssuanceBatches(query);
  }

  /**
   * 查询发行批次详情。
   */
  @Get(':batchId')
  async getIssuanceBatchById(@Param('batchId') batchId: string) {
    return this.issuanceBatchesService.getIssuanceBatchById(batchId);
  }

  /**
   * 创建发行批次。
   */
  @Post()
  async createIssuanceBatch(@Body() body: CreateIssuanceBatchRequestDto) {
    return this.issuanceBatchesService.createIssuanceBatch(body);
  }

  /**
   * 编辑发行批次。
   */
  @Patch(':batchId')
  async updateIssuanceBatch(
    @Param('batchId') batchId: string,
    @Body() body: UpdateIssuanceBatchRequestDto,
  ) {
    return this.issuanceBatchesService.updateIssuanceBatch(batchId, body);
  }

  /**
   * 更新发行批次状态。
   */
  @Patch(':batchId/status')
  async updateIssuanceBatchStatus(
    @Param('batchId') batchId: string,
    @Body() body: UpdateIssuanceBatchStatusRequestDto,
  ) {
    return this.issuanceBatchesService.updateIssuanceBatchStatus(batchId, body);
  }
}
