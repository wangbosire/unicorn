import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type {
  GenerateActivationCodesRequest,
  ListActivationCodesQuery,
} from '@contracts/admin/activation-codes';
import { AdminAccessGuard } from '../../admin/auth/admin-access.guard';
import { ADMIN_PERMISSION_ISSUANCE_ACTIVATION_CODES } from '../../admin/auth/admin-permission-keys';
import { RequireAdminPermissions } from '../../admin/auth/admin-permissions.decorator';
import { ActivationCodesService } from './activation-codes.service';

/**
 * 激活码管理控制器。
 * 当前挂载在后台接口边界下，对应 `admin-api/activation-codes`。
 */
@Controller('admin-api/activation-codes')
@UseGuards(AdminAccessGuard)
@RequireAdminPermissions(ADMIN_PERMISSION_ISSUANCE_ACTIVATION_CODES)
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
   * 查询单个激活码详情。
   */
  @Get(':activationCodeId')
  async getActivationCodeById(
    @Param('activationCodeId') activationCodeId: string,
  ) {
    return this.activationCodesService.getActivationCodeById(activationCodeId);
  }

  /**
   * 批量生成激活码并同步创建待领取藏品。
   */
  @Post('generate')
  async generateActivationCodes(@Body() body: GenerateActivationCodesRequest) {
    return this.activationCodesService.generateActivationCodes(body);
  }

  /**
   * 作废单条激活码（仅未使用且未过期状态可操作）。
   */
  @Patch(':activationCodeId/void')
  async voidActivationCode(
    @Param('activationCodeId') activationCodeId: string,
  ) {
    return this.activationCodesService.voidActivationCode(activationCodeId);
  }
}
