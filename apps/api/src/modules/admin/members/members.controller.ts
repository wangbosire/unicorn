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
   * 查询会员详情。
   */
  @Get(':memberId')
  @RequireAdminPermissions(ADMIN_PERMISSION_MEMBERS_READ)
  async getMemberById(@Param('memberId') memberId: string) {
    return this.membersService.getMemberById(memberId);
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

  /**
   * 冻结会员。
   * 为兼容接口清单中的动作型路由，内部复用统一状态更新逻辑。
   */
  @Patch(':memberId/freeze')
  @RequireAdminPermissions(ADMIN_PERMISSION_MEMBERS_MANAGE)
  async freezeMember(@Param('memberId') memberId: string) {
    return this.membersService.updateMemberStatus(memberId, {
      status: 'FROZEN',
    });
  }

  /**
   * 解冻会员。
   * 为兼容接口清单中的动作型路由，内部复用统一状态更新逻辑。
   */
  @Patch(':memberId/unfreeze')
  @RequireAdminPermissions(ADMIN_PERMISSION_MEMBERS_MANAGE)
  async unfreezeMember(@Param('memberId') memberId: string) {
    return this.membersService.updateMemberStatus(memberId, {
      status: 'ACTIVE',
    });
  }
}
