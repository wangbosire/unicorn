import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import type { ListMembersQuery, UpdateMemberStatusRequest } from '@contracts/admin/members';
import { BizError } from '../../../common/http/biz-error';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import type { AdminHttpRequest } from '../auth/admin-http.types';
import {
  ADMIN_PERMISSION_MEMBERS_FREEZE,
  ADMIN_PERMISSION_MEMBERS_READ,
  ADMIN_PERMISSION_MEMBERS_UNFREEZE,
  ADMIN_PERMISSION_WILDCARD,
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
  async updateMemberStatus(
    @Param('memberId') memberId: string,
    @Body() body: UpdateMemberStatusRequest,
    @Req() request: AdminHttpRequest,
  ) {
    this.ensurePermissionForTargetStatus(request, body.status);
    return this.membersService.updateMemberStatus(memberId, body);
  }

  /**
   * 冻结会员。
   * 为兼容接口清单中的动作型路由，内部复用统一状态更新逻辑。
   */
  @Patch(':memberId/freeze')
  @RequireAdminPermissions(ADMIN_PERMISSION_MEMBERS_FREEZE)
  async freezeMember(
    @Param('memberId') memberId: string,
  ) {
    return this.membersService.updateMemberStatus(memberId, {
      status: 'FROZEN',
    });
  }

  /**
   * 解冻会员。
   * 为兼容接口清单中的动作型路由，内部复用统一状态更新逻辑。
   */
  @Patch(':memberId/unfreeze')
  @RequireAdminPermissions(ADMIN_PERMISSION_MEMBERS_UNFREEZE)
  async unfreezeMember(
    @Param('memberId') memberId: string,
  ) {
    return this.membersService.updateMemberStatus(memberId, {
      status: 'ACTIVE',
    });
  }

  /**
   * 通用状态更新接口按目标状态映射到最新 action 权限点。
   */
  private ensurePermissionForTargetStatus(
    request: AdminHttpRequest,
    status: UpdateMemberStatusRequest['status'],
  ) {
    const currentPermissionKeys = request.admin?.permissionKeys ?? [];
    const requiredPermission =
      status === 'FROZEN'
        ? ADMIN_PERMISSION_MEMBERS_FREEZE
        : ADMIN_PERMISSION_MEMBERS_UNFREEZE;

    if (
      currentPermissionKeys.includes(ADMIN_PERMISSION_WILDCARD) ||
      currentPermissionKeys.includes(requiredPermission)
    ) {
      return;
    }

    throw new BizError({
      code: 'ADMIN_AUTH_FORBIDDEN',
      message: 'insufficient admin permissions',
      status: 403,
    });
  }
}
