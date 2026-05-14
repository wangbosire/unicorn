import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type {
  GenerateActivationCodesRequest,
  ListActivationCodesQuery,
} from '@contracts/admin/activation-codes';
import { ActivationCodesService } from './activation-codes.service';

/**
 * 激活码管理控制器。
 * 当前挂载在后台接口边界下，对应 `admin-api/activation-codes`。
 */
@Controller('admin-api/activation-codes')
export class ActivationCodesController {
  constructor(private readonly activationCodesService: ActivationCodesService) {}

  /**
   * 查询激活码列表。
   */
  @Get()
  async listActivationCodes(@Query() query: ListActivationCodesQuery) {
    return this.activationCodesService.listActivationCodes(query);
  }

  /**
   * 批量生成激活码并同步创建待领取藏品。
   */
  @Post('generate')
  async generateActivationCodes(@Body() body: GenerateActivationCodesRequest) {
    return this.activationCodesService.generateActivationCodes(body);
  }
}
