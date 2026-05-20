import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type {
  ListAuthorizationChangeLogsQuery,
  ListAdminUsersQuery,
  ListMenusQuery,
  ListPermissionGroupsQuery,
  ListPermissionsQuery,
  ListRolesQuery,
  UpdateAdminUserRolesRequest,
  UpdateMenuPermissionGroupsRequest,
  UpdatePermissionGroupPermissionsRequest,
  UpdateRolePermissionsRequest,
} from '@contracts/admin/system';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import type { AdminHttpRequest } from '../auth/admin-http.types';
import {
  ADMIN_PERMISSION_ADMIN_USERS_ASSIGN_ROLES,
  ADMIN_PERMISSION_ADMIN_USERS_READ,
  ADMIN_PERMISSION_MENUS_READ,
  ADMIN_PERMISSION_MENUS_UPDATE,
  ADMIN_PERMISSION_PERMISSION_GROUPS_READ,
  ADMIN_PERMISSION_PERMISSION_GROUPS_UPDATE,
  ADMIN_PERMISSION_PERMISSIONS_READ,
  ADMIN_PERMISSION_ROLES_ASSIGN_PERMISSIONS,
  ADMIN_PERMISSION_ROLES_READ,
} from '../auth/admin-permission-keys';
import { RequireAdminPermissions } from '../auth/admin-permissions.decorator';
import { SystemService } from './system.service';

/**
 * 后台系统管理只读控制器。
 * 当前提供后台用户、角色、权限点、权限组、菜单的查询接口。
 */
@Controller('admin-api/system')
@UseGuards(AdminAccessGuard)
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  /**
   * 分页查询权限变更日志。
   */
  @Get('authorization-change-logs')
  @RequireAdminPermissions(ADMIN_PERMISSION_PERMISSIONS_READ)
  async listAuthorizationChangeLogs(
    @Query() query: ListAuthorizationChangeLogsQuery,
  ) {
    return this.systemService.listAuthorizationChangeLogs(query);
  }

  /**
   * 分页查询后台用户列表。
   */
  @Get('admin-users')
  @RequireAdminPermissions(ADMIN_PERMISSION_ADMIN_USERS_READ)
  async listAdminUsers(@Query() query: ListAdminUsersQuery) {
    return this.systemService.listAdminUsers(query);
  }

  /**
   * 查询后台用户详情。
   */
  @Get('admin-users/:adminUserId')
  @RequireAdminPermissions(ADMIN_PERMISSION_ADMIN_USERS_READ)
  async getAdminUserById(@Param('adminUserId') adminUserId: string) {
    return this.systemService.getAdminUserById(adminUserId);
  }

  /**
   * 保存后台用户角色分配。
   */
  @Patch('admin-users/:adminUserId/roles')
  @RequireAdminPermissions(ADMIN_PERMISSION_ADMIN_USERS_ASSIGN_ROLES)
  async updateAdminUserRoles(
    @Param('adminUserId') adminUserId: string,
    @Body() body: UpdateAdminUserRolesRequest,
    @Req() request: AdminHttpRequest,
  ) {
    return this.systemService.updateAdminUserRoles(
      adminUserId,
      body,
      request.admin?.id ?? null,
    );
  }

  /**
   * 分页查询角色列表。
   */
  @Get('roles')
  @RequireAdminPermissions(ADMIN_PERMISSION_ROLES_READ)
  async listRoles(@Query() query: ListRolesQuery) {
    return this.systemService.listRoles(query);
  }

  /**
   * 查询角色详情。
   */
  @Get('roles/:roleId')
  @RequireAdminPermissions(ADMIN_PERMISSION_ROLES_READ)
  async getRoleById(@Param('roleId') roleId: string) {
    return this.systemService.getRoleById(roleId);
  }

  /**
   * 保存角色权限。
   * 支持提交权限组与额外 action 权限，服务端统一展开后写入角色最终权限集。
   */
  @Patch('roles/:roleId/permissions')
  @RequireAdminPermissions(ADMIN_PERMISSION_ROLES_ASSIGN_PERMISSIONS)
  async updateRolePermissions(
    @Param('roleId') roleId: string,
    @Body() body: UpdateRolePermissionsRequest,
    @Req() request: AdminHttpRequest,
  ) {
    return this.systemService.updateRolePermissions(
      roleId,
      body,
      request.admin?.id ?? null,
    );
  }

  /**
   * 分页查询权限点列表。
   */
  @Get('permissions')
  @RequireAdminPermissions(ADMIN_PERMISSION_PERMISSIONS_READ)
  async listPermissions(@Query() query: ListPermissionsQuery) {
    return this.systemService.listPermissions(query);
  }

  /**
   * 查询权限点详情。
   */
  @Get('permissions/:permissionId')
  @RequireAdminPermissions(ADMIN_PERMISSION_PERMISSIONS_READ)
  async getPermissionById(@Param('permissionId') permissionId: string) {
    return this.systemService.getPermissionById(permissionId);
  }

  /**
   * 分页查询权限组列表。
   */
  @Get('permission-groups')
  @RequireAdminPermissions(ADMIN_PERMISSION_PERMISSION_GROUPS_READ)
  async listPermissionGroups(@Query() query: ListPermissionGroupsQuery) {
    return this.systemService.listPermissionGroups(query);
  }

  /**
   * 查询权限组详情。
   */
  @Get('permission-groups/:permissionGroupId')
  @RequireAdminPermissions(ADMIN_PERMISSION_PERMISSION_GROUPS_READ)
  async getPermissionGroupById(
    @Param('permissionGroupId') permissionGroupId: string,
  ) {
    return this.systemService.getPermissionGroupById(permissionGroupId);
  }

  /**
   * 保存权限组成员。
   */
  @Patch('permission-groups/:permissionGroupId/permissions')
  @RequireAdminPermissions(ADMIN_PERMISSION_PERMISSION_GROUPS_UPDATE)
  async updatePermissionGroupPermissions(
    @Param('permissionGroupId') permissionGroupId: string,
    @Body() body: UpdatePermissionGroupPermissionsRequest,
    @Req() request: AdminHttpRequest,
  ) {
    return this.systemService.updatePermissionGroupPermissions(
      permissionGroupId,
      body,
      request.admin?.id ?? null,
    );
  }

  /**
   * 分页查询菜单列表。
   */
  @Get('menus')
  @RequireAdminPermissions(ADMIN_PERMISSION_MENUS_READ)
  async listMenus(@Query() query: ListMenusQuery) {
    return this.systemService.listMenus(query);
  }

  /**
   * 查询菜单详情。
   */
  @Get('menus/:menuId')
  @RequireAdminPermissions(ADMIN_PERMISSION_MENUS_READ)
  async getMenuById(@Param('menuId') menuId: string) {
    return this.systemService.getMenuById(menuId);
  }

  /**
   * 保存菜单权限组绑定。
   */
  @Patch('menus/:menuId/permission-groups')
  @RequireAdminPermissions(ADMIN_PERMISSION_MENUS_UPDATE)
  async updateMenuPermissionGroups(
    @Param('menuId') menuId: string,
    @Body() body: UpdateMenuPermissionGroupsRequest,
    @Req() request: AdminHttpRequest,
  ) {
    return this.systemService.updateMenuPermissionGroups(
      menuId,
      body,
      request.admin?.id ?? null,
    );
  }
}
