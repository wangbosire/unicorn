import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import type { ListMembersQuery, UpdateMemberStatusRequest } from '@contracts/admin/members';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import {
  ADMIN_PERMISSION_MEMBERS_MANAGE,
  ADMIN_PERMISSION_MEMBERS_READ,
} from '../auth/admin-permission-keys';
import { RequireAdminPermissions } from '../auth/admin-permissions.decorator';
import { MembersService } from './members.service';

/**
 * 后台会员管理控制器。
 * 对应 `admin-api/members`。
 */
@Controller('admin-api/members')
@UseGuards(AdminAccessGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  /**
   * 分页查询会员列表。
   */
  @Get()
  @RequireAdminPermissions(ADMIN_PERMISSION_MEMBERS_READ)
  async listMembers(@Query() query: ListMembersQuery) {
    return this.membersService.listMembers(query);
  }

  /**
   * 更新会员状态（冻结 / 解冻）。
   */
  @Patch(':memberId/status')
  @RequireAdminPermissions(ADMIN_PERMISSION_MEMBERS_MANAGE)
  async updateMemberStatus(
    @Param('memberId') memberId: string,
    @Body() body: UpdateMemberStatusRequest,
  ) {
    return this.membersService.updateMemberStatus(memberId, body);
  }
}
