import { Injectable } from '@nestjs/common';
import {
  AdminUserStatus,
  AuthorizationChangeTargetType,
  AuthorizationChangeType,
  MenuStatus,
  MenuType,
  PermissionGroupStatus,
  PermissionGroupType,
  PermissionStatus,
  PermissionType,
  Prisma,
  RoleStatus,
} from '@prisma/client';
import type {
  AdminAuthorizationChangeLogListItem,
  AdminMenuDetail,
  AdminMenuListItem,
  AdminPermissionDetail,
  AdminPermissionGroupDetail,
  AdminPermissionGroupListItem,
  AdminPermissionListItem,
  AdminRoleDetail,
  AdminRoleListItem,
  AdminUserDetail,
  AdminUserListItem,
  ListAuthorizationChangeLogsQuery,
  ListAuthorizationChangeLogsResponseData,
  ListAdminUsersQuery,
  ListAdminUsersResponseData,
  ListMenusQuery,
  ListMenusResponseData,
  ListPermissionGroupsQuery,
  ListPermissionGroupsResponseData,
  ListPermissionsQuery,
  ListPermissionsResponseData,
  ListRolesQuery,
  ListRolesResponseData,
  UpdateAdminUserRolesRequest,
  UpdateAdminUserRolesResponseData,
  UpdateMenuPermissionGroupsRequest,
  UpdateMenuPermissionGroupsResponseData,
  UpdatePermissionGroupPermissionsRequest,
  UpdatePermissionGroupPermissionsResponseData,
  UpdateRolePermissionsRequest,
  UpdateRolePermissionsResponseData,
} from '@contracts/admin/system';
import { BizError } from '../../../common/http/biz-error';
import {
  buildPaginatedResult,
  parsePaginationQuery,
} from '../../../common/pagination/pagination';
import {
  toNullableTimestamp,
  toTimestamp,
} from '../../../common/serializers/timestamp';
import { parseOptionalEnumValue } from '../../../common/validation/enum';
import { nullableTextField, requiredIdField } from '../../../common/validation/fields';
import { parseWithSchema } from '../../../common/validation/schema';
import { PrismaService } from '../../../platform/prisma/prisma.service';
import { ADMIN_PERMISSION_WILDCARD } from '../auth/admin-permission-keys';
import { z } from 'zod';

const adminUserListInclude = {
  roles: {
    include: {
      role: true,
    },
  },
} satisfies Prisma.AdminUserInclude;

const adminUserDetailInclude = {
  reviewedItems: {
    select: { id: true },
  },
  reviewedComments: {
    select: { id: true },
  },
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.AdminUserInclude;

type AdminUserListRow = Prisma.AdminUserGetPayload<{
  include: typeof adminUserListInclude;
}>;

type AdminUserDetailRow = Prisma.AdminUserGetPayload<{
  include: typeof adminUserDetailInclude;
}>;

const updateRolePermissionsSchema = z.object({
  permissionGroupIds: z.array(requiredIdField('permission group')).default([]),
  permissionIds: z.array(requiredIdField('permission')).default([]),
  changeReason: nullableTextField().optional(),
});

const updateAdminUserRolesSchema = z.object({
  roleIds: z.array(requiredIdField('role')).default([]),
  changeReason: nullableTextField().optional(),
});

const updateMenuPermissionGroupsSchema = z.object({
  permissionGroupIds: z.array(requiredIdField('permission group')).default([]),
  changeReason: nullableTextField().optional(),
});

const updatePermissionGroupPermissionsSchema = z.object({
  permissionIds: z.array(requiredIdField('permission')).default([]),
  changeReason: nullableTextField().optional(),
});

/**
 * 后台系统管理只读服务。
 */
@Injectable()
export class SystemService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 分页查询后台用户列表。
   */
  async listAdminUsers(
    query: ListAdminUsersQuery,
  ): Promise<ListAdminUsersResponseData> {
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const search = query.search?.trim();
    const status = parseOptionalEnumValue(
      query.status,
      [AdminUserStatus.ACTIVE, AdminUserStatus.DISABLED],
      'INVALID_ADMIN_USER_STATUS',
      'invalid admin user status in query',
    );
    const roleKey = query.roleKey?.trim();

    const where: Prisma.AdminUserWhereInput = {
      ...(status ? { status } : {}),
      ...(roleKey
        ? {
            roles: {
              some: {
                role: { roleKey },
              },
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { accountNo: { contains: search } },
              { username: { contains: search } },
              { displayName: { contains: search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.adminUser.findMany({
        where,
        include: adminUserListInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.adminUser.count({ where }),
    ]);

    return buildPaginatedResult({
      items: rows.map((row) => this.toAdminUserListItem(row)),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 分页查询权限变更日志。
   */
  async listAuthorizationChangeLogs(
    query: ListAuthorizationChangeLogsQuery,
  ): Promise<ListAuthorizationChangeLogsResponseData> {
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const targetType = parseOptionalEnumValue(
      query.targetType,
      [
        AuthorizationChangeTargetType.ADMIN_USER,
        AuthorizationChangeTargetType.ROLE,
        AuthorizationChangeTargetType.PERMISSION,
        AuthorizationChangeTargetType.PERMISSION_GROUP,
        AuthorizationChangeTargetType.MENU,
      ],
      'INVALID_AUTHORIZATION_CHANGE_TARGET_TYPE',
      'invalid authorization change target type in query',
    );
    const changeType = parseOptionalEnumValue(
      query.changeType,
      [
        AuthorizationChangeType.CREATE,
        AuthorizationChangeType.UPDATE,
        AuthorizationChangeType.ENABLE,
        AuthorizationChangeType.DISABLE,
        AuthorizationChangeType.REPLACE_BINDINGS,
        AuthorizationChangeType.ASSIGN,
        AuthorizationChangeType.REVOKE,
      ],
      'INVALID_AUTHORIZATION_CHANGE_TYPE',
      'invalid authorization change type in query',
    );
    const operatorAdminUserId = query.operatorAdminUserId?.trim();
    const targetId = query.targetId?.trim();

    const where: Prisma.AuthorizationChangeLogWhereInput = {
      ...(targetType ? { targetType } : {}),
      ...(changeType ? { changeType } : {}),
      ...(operatorAdminUserId
        ? {
            operatorAdminUserId: this.requireId(
              operatorAdminUserId,
              'operator admin user',
            ),
          }
        : {}),
      ...(targetId ? { targetId } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.authorizationChangeLog.findMany({
        where,
        include: {
          operatorAdminUser: true,
        },
        orderBy: [{ createdAt: 'desc' }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.authorizationChangeLog.count({ where }),
    ]);

    const targetLabels = await this.resolveAuthorizationTargets(rows);

    return buildPaginatedResult({
      items: rows.map((row) => {
        const target = targetLabels.get(`${row.targetType}:${row.targetId}`);
        return {
          changeLogId: row.id,
          targetType: row.targetType,
          targetId: row.targetId,
          targetKey: target?.targetKey ?? null,
          targetName: target?.targetName ?? null,
          changeType: row.changeType,
          operatorAdminUserId: row.operatorAdminUserId,
          operatorAccountNo: row.operatorAdminUser.accountNo,
          operatorUsername: row.operatorAdminUser.username,
          operatorDisplayName: row.operatorAdminUser.displayName,
          beforeSnapshot: row.beforeSnapshot ?? null,
          afterSnapshot: row.afterSnapshot ?? null,
          changeReason: row.changeReason ?? null,
          createdAt: toTimestamp(row.createdAt),
        } satisfies AdminAuthorizationChangeLogListItem
      }),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    })
  }

  /**
   * 查询后台用户详情。
   */
  async getAdminUserById(adminUserId: string): Promise<AdminUserDetail> {
    const row = await this.prisma.adminUser.findUnique({
      where: { id: this.requireId(adminUserId, 'admin user') },
      include: adminUserDetailInclude,
    });

    if (!row) {
      throw new BizError({
        code: 'ADMIN_USER_NOT_FOUND',
        message: 'admin user not found',
        status: 404,
      });
    }

    return {
      adminUserId: row.id,
      accountNo: row.accountNo,
      username: row.username,
      displayName: row.displayName,
      status: row.status,
      authzVersion: row.authzVersion,
      roles: row.roles.map((item) => ({
        roleId: item.role.id,
        roleKey: item.role.roleKey,
        roleName: item.role.roleName,
        status: item.role.status,
        isBuiltin: item.role.isBuiltin,
      })),
      permissionKeys: this.collectPermissionKeys(row),
      reviewedContentCount: row.reviewedItems.length,
      reviewedCommentCount: row.reviewedComments.length,
      lastLoginAt: toNullableTimestamp(row.lastLoginAt),
      createdAt: toTimestamp(row.createdAt),
      updatedAt: toTimestamp(row.updatedAt),
    };
  }

  /**
   * 保存后台用户角色分配。
   */
  async updateAdminUserRoles(
    adminUserId: string,
    payload: UpdateAdminUserRolesRequest,
    operatorAdminUserId: string | null,
  ): Promise<UpdateAdminUserRolesResponseData> {
    const normalizedAdminUserId = this.requireId(adminUserId, 'admin user');
    const operatorId = this.requireId(operatorAdminUserId ?? '', 'operator admin user');
    const input = parseWithSchema(updateAdminUserRolesSchema, payload);
    const roleIds = [...new Set(input.roleIds)].sort();

    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: normalizedAdminUserId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!adminUser) {
      throw new BizError({
        code: 'ADMIN_USER_NOT_FOUND',
        message: 'admin user not found',
        status: 404,
      });
    }

    const roles =
      roleIds.length > 0
        ? await this.prisma.role.findMany({
            where: {
              id: { in: roleIds },
            },
          })
        : [];

    if (roles.length !== roleIds.length) {
      throw new BizError({
        code: 'ROLE_NOT_FOUND',
        message: 'one or more roles do not exist',
      });
    }

    const disabledRole = roles.find((role) => role.status !== RoleStatus.ENABLED);
    if (disabledRole) {
      throw new BizError({
        code: 'ROLE_DISABLED',
        message: 'disabled role cannot be assigned',
        status: 409,
      });
    }

    const currentRoleIds = adminUser.roles.map((item) => item.roleId).sort();
    const unchanged =
      currentRoleIds.length === roleIds.length &&
      currentRoleIds.every((roleId, index) => roleId === roleIds[index]);

    if (unchanged) {
      return {
        adminUserId: adminUser.id,
        accountNo: adminUser.accountNo,
        roleIds,
        roleKeys: adminUser.roles
          .map((item) => item.role.roleKey)
          .sort(),
        authzVersion: adminUser.authzVersion,
        updatedAt: toTimestamp(adminUser.updatedAt),
      };
    }

    const nextRoleKeys = roles.map((role) => role.roleKey).sort();
    const handledAt = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.adminUserRole.deleteMany({
        where: { adminUserId: adminUser.id },
      });

      if (roleIds.length > 0) {
        await tx.adminUserRole.createMany({
          data: roleIds.map((roleId) => ({
            adminUserId: adminUser.id,
            roleId,
          })),
        });
      }

      const nextUser = await tx.adminUser.update({
        where: { id: adminUser.id },
        data: {
          authzVersion: {
            increment: 1,
          },
        },
        select: {
          id: true,
          accountNo: true,
          authzVersion: true,
          updatedAt: true,
        },
      });

      await tx.authorizationChangeLog.create({
        data: {
          targetType: AuthorizationChangeTargetType.ADMIN_USER,
          targetId: adminUser.id,
          changeType: AuthorizationChangeType.REPLACE_BINDINGS,
          operatorAdminUserId: operatorId,
          beforeSnapshot: {
            roleIds: currentRoleIds,
            roleKeys: adminUser.roles.map((item) => item.role.roleKey).sort(),
          },
          afterSnapshot: {
            roleIds,
            roleKeys: nextRoleKeys,
          },
          changeReason: input.changeReason ?? null,
          createdAt: handledAt,
        },
      });

      return nextUser;
    });

    return {
      adminUserId: updated.id,
      accountNo: updated.accountNo,
      roleIds,
      roleKeys: nextRoleKeys,
      authzVersion: updated.authzVersion,
      updatedAt: toTimestamp(updated.updatedAt),
    };
  }

  /**
   * 分页查询角色列表。
   */
  async listRoles(query: ListRolesQuery): Promise<ListRolesResponseData> {
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const search = query.search?.trim();
    const status = parseOptionalEnumValue(
      query.status,
      [RoleStatus.ENABLED, RoleStatus.DISABLED],
      'INVALID_ROLE_STATUS',
      'invalid role status in query',
    );
    const isBuiltin = this.parseOptionalBoolean(
      query.isBuiltin,
      'INVALID_IS_BUILTIN',
      'invalid isBuiltin flag in query',
    );

    const where: Prisma.RoleWhereInput = {
      ...(status ? { status } : {}),
      ...(isBuiltin === undefined ? {} : { isBuiltin }),
      ...(search
        ? {
            OR: [
              { roleKey: { contains: search } },
              { roleName: { contains: search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        where,
        include: {
          _count: {
            select: {
              users: true,
              permissions: true,
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.role.count({ where }),
    ]);

    return buildPaginatedResult({
      items: rows.map((row) => ({
        roleId: row.id,
        roleKey: row.roleKey,
        roleName: row.roleName,
        description: row.description ?? null,
        status: row.status,
        isBuiltin: row.isBuiltin,
        sortOrder: row.sortOrder,
        permissionVersion: row.permissionVersion,
        permissionCount: row._count.permissions,
        assignedUserCount: row._count.users,
        createdAt: toTimestamp(row.createdAt),
        updatedAt: toTimestamp(row.updatedAt),
      })),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 查询角色详情。
   */
  async getRoleById(roleId: string): Promise<AdminRoleDetail> {
    const row = await this.prisma.role.findUnique({
      where: { id: this.requireId(roleId, 'role') },
      include: {
        permissions: {
          include: {
            permission: true,
          },
          orderBy: {
            permission: {
              sortOrder: 'asc',
            },
          },
        },
        users: {
          include: {
            adminUser: true,
          },
          orderBy: {
            adminUser: {
              createdAt: 'desc',
            },
          },
        },
      },
    });

    if (!row) {
      throw new BizError({
        code: 'ROLE_NOT_FOUND',
        message: 'role not found',
        status: 404,
      });
    }

    return {
      roleId: row.id,
      roleKey: row.roleKey,
      roleName: row.roleName,
      description: row.description ?? null,
      status: row.status,
      isBuiltin: row.isBuiltin,
      sortOrder: row.sortOrder,
      permissionVersion: row.permissionVersion,
      permissions: row.permissions.map((item) => ({
        permissionId: item.permission.id,
        permissionKey: item.permission.permissionKey,
        permissionName: item.permission.permissionName,
        permissionType: item.permission.permissionType,
        status: item.permission.status,
        isBuiltin: item.permission.isBuiltin,
      })),
      assignedUsers: row.users.map((item) => ({
        adminUserId: item.adminUser.id,
        accountNo: item.adminUser.accountNo,
        username: item.adminUser.username,
        displayName: item.adminUser.displayName,
        status: item.adminUser.status,
      })),
      createdAt: toTimestamp(row.createdAt),
      updatedAt: toTimestamp(row.updatedAt),
    };
  }

  /**
   * 保存角色权限。
   * 角色最终授权真相源仍为 `role_permissions`，权限组仅作为配置输入层。
   */
  async updateRolePermissions(
    roleId: string,
    payload: UpdateRolePermissionsRequest,
    operatorAdminUserId: string | null,
  ): Promise<UpdateRolePermissionsResponseData> {
    const normalizedRoleId = this.requireId(roleId, 'role');
    const operatorId = this.requireId(operatorAdminUserId ?? '', 'operator admin user');
    const input = parseWithSchema(updateRolePermissionsSchema, payload);
    const permissionGroupIds = [...new Set(input.permissionGroupIds)];
    const explicitPermissionIds = [...new Set(input.permissionIds)];

    const role = await this.prisma.role.findUnique({
      where: { id: normalizedRoleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new BizError({
        code: 'ROLE_NOT_FOUND',
        message: 'role not found',
        status: 404,
      });
    }

    const [groups, explicitPermissions] = await Promise.all([
      permissionGroupIds.length > 0
        ? this.prisma.permissionGroup.findMany({
            where: {
              id: { in: permissionGroupIds },
            },
            include: {
              items: {
                include: {
                  permission: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      explicitPermissionIds.length > 0
        ? this.prisma.permission.findMany({
            where: {
              id: { in: explicitPermissionIds },
            },
          })
        : Promise.resolve([]),
    ]);

    if (groups.length !== permissionGroupIds.length) {
      throw new BizError({
        code: 'PERMISSION_GROUP_NOT_FOUND',
        message: 'one or more permission groups do not exist',
      });
    }

    const disabledGroup = groups.find(
      (group) => group.status !== PermissionGroupStatus.ENABLED,
    );
    if (disabledGroup) {
      throw new BizError({
        code: 'PERMISSION_GROUP_DISABLED',
        message: 'disabled permission group cannot be assigned',
        status: 409,
      });
    }

    if (explicitPermissions.length !== explicitPermissionIds.length) {
      throw new BizError({
        code: 'PERMISSION_NOT_FOUND',
        message: 'one or more permissions do not exist',
      });
    }

    const disabledPermission = explicitPermissions.find(
      (permission) => permission.status !== PermissionStatus.ENABLED,
    );
    if (disabledPermission) {
      throw new BizError({
        code: 'PERMISSION_DISABLED',
        message: 'disabled permission cannot be assigned',
        status: 409,
      });
    }

    const currentPermissionIds = role.permissions.map((item) => item.permissionId);
    const currentHasWildcard = role.permissions.some(
      (item) => item.permission.permissionKey === ADMIN_PERMISSION_WILDCARD,
    );

    const resolvedPermissionMap = new Map<string, string>();
    for (const permission of explicitPermissions) {
      resolvedPermissionMap.set(permission.id, permission.permissionKey);
    }
    for (const group of groups) {
      for (const item of group.items) {
        if (item.permission.status !== PermissionStatus.ENABLED) {
          continue;
        }
        resolvedPermissionMap.set(item.permission.id, item.permission.permissionKey);
      }
    }

    if (currentHasWildcard) {
      const wildcardPermission = role.permissions.find(
        (item) => item.permission.permissionKey === ADMIN_PERMISSION_WILDCARD,
      )?.permission;
      if (wildcardPermission) {
        resolvedPermissionMap.set(
          wildcardPermission.id,
          wildcardPermission.permissionKey,
        );
      }
    }

    const resolvedPermissionIds = [...resolvedPermissionMap.keys()].sort();
    const resolvedPermissionKeys = [...resolvedPermissionMap.values()].sort();
    const handledAt = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId: role.id },
      });

      if (resolvedPermissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: resolvedPermissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
        });
      }

      const nextRole = await tx.role.update({
        where: { id: role.id },
        data: {
          permissionVersion: {
            increment: 1,
          },
        },
        select: {
          id: true,
          roleKey: true,
          permissionVersion: true,
          updatedAt: true,
        },
      });

      await tx.adminUser.updateMany({
        where: {
          roles: {
            some: {
              roleId: role.id,
            },
          },
        },
        data: {
          authzVersion: {
            increment: 1,
          },
        },
      });

      await tx.authorizationChangeLog.create({
        data: {
          targetType: AuthorizationChangeTargetType.ROLE,
          targetId: role.id,
          changeType: AuthorizationChangeType.REPLACE_BINDINGS,
          operatorAdminUserId: operatorId,
          beforeSnapshot: {
            permissionIds: currentPermissionIds,
          },
          afterSnapshot: {
            permissionGroupIds,
            permissionIds: resolvedPermissionIds,
            permissionKeys: resolvedPermissionKeys,
          },
          changeReason: input.changeReason ?? null,
          createdAt: handledAt,
        },
      });

      return nextRole;
    });

    return {
      roleId: updated.id,
      roleKey: updated.roleKey,
      permissionVersion: updated.permissionVersion,
      permissionGroupIds,
      permissionIds: resolvedPermissionIds,
      permissionKeys: resolvedPermissionKeys,
      updatedAt: toTimestamp(updated.updatedAt),
    };
  }

  /**
   * 分页查询权限点列表。
   */
  async listPermissions(
    query: ListPermissionsQuery,
  ): Promise<ListPermissionsResponseData> {
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const search = query.search?.trim();
    const status = parseOptionalEnumValue(
      query.status,
      [PermissionStatus.ENABLED, PermissionStatus.DISABLED],
      'INVALID_PERMISSION_STATUS',
      'invalid permission status in query',
    );
    const permissionType = parseOptionalEnumValue(
      query.permissionType,
      [PermissionType.PAGE, PermissionType.ACTION],
      'INVALID_PERMISSION_TYPE',
      'invalid permission type in query',
    );
    const isBuiltin = this.parseOptionalBoolean(
      query.isBuiltin,
      'INVALID_IS_BUILTIN',
      'invalid isBuiltin flag in query',
    );
    const orphanOnly = this.parseOptionalBoolean(
      query.orphanOnly,
      'INVALID_ORPHAN_ONLY',
      'invalid orphanOnly flag in query',
    );

    const where: Prisma.PermissionWhereInput = {
      ...(status ? { status } : {}),
      ...(permissionType ? { permissionType } : {}),
      ...(isBuiltin === undefined ? {} : { isBuiltin }),
      ...(orphanOnly ? { groupItems: { none: {} } } : {}),
      ...(search
        ? {
            OR: [
              { permissionKey: { contains: search } },
              { permissionName: { contains: search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.permission.findMany({
        where,
        include: {
          _count: {
            select: {
              groupItems: true,
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.permission.count({ where }),
    ]);

    return buildPaginatedResult({
      items: rows.map((row) => ({
        permissionId: row.id,
        permissionKey: row.permissionKey,
        permissionName: row.permissionName,
        permissionType: row.permissionType,
        description: row.description ?? null,
        status: row.status,
        isBuiltin: row.isBuiltin,
        sortOrder: row.sortOrder,
        groupCount: row._count.groupItems,
        createdAt: toTimestamp(row.createdAt),
        updatedAt: toTimestamp(row.updatedAt),
      })),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 查询权限点详情。
   */
  async getPermissionById(permissionId: string): Promise<AdminPermissionDetail> {
    const row = await this.prisma.permission.findUnique({
      where: { id: this.requireId(permissionId, 'permission') },
      include: {
        groupItems: {
          include: {
            permissionGroup: true,
          },
          orderBy: {
            permissionGroup: {
              sortOrder: 'asc',
            },
          },
        },
      },
    });

    if (!row) {
      throw new BizError({
        code: 'PERMISSION_NOT_FOUND',
        message: 'permission not found',
        status: 404,
      });
    }

    return {
      permissionId: row.id,
      permissionKey: row.permissionKey,
      permissionName: row.permissionName,
      permissionType: row.permissionType,
      description: row.description ?? null,
      status: row.status,
      isBuiltin: row.isBuiltin,
      sortOrder: row.sortOrder,
      groups: row.groupItems.map((item) => ({
        permissionGroupId: item.permissionGroup.id,
        groupKey: item.permissionGroup.groupKey,
        groupName: item.permissionGroup.groupName,
        status: item.permissionGroup.status,
      })),
      createdAt: toTimestamp(row.createdAt),
      updatedAt: toTimestamp(row.updatedAt),
    };
  }

  /**
   * 分页查询权限组列表。
   */
  async listPermissionGroups(
    query: ListPermissionGroupsQuery,
  ): Promise<ListPermissionGroupsResponseData> {
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const search = query.search?.trim();
    const status = parseOptionalEnumValue(
      query.status,
      [PermissionGroupStatus.ENABLED, PermissionGroupStatus.DISABLED],
      'INVALID_PERMISSION_GROUP_STATUS',
      'invalid permission group status in query',
    );
    const groupType = parseOptionalEnumValue(
      query.groupType,
      [
        PermissionGroupType.BUSINESS,
        PermissionGroupType.SYSTEM,
        PermissionGroupType.PAGE_DOMAIN,
      ],
      'INVALID_PERMISSION_GROUP_TYPE',
      'invalid permission group type in query',
    );
    const isBuiltin = this.parseOptionalBoolean(
      query.isBuiltin,
      'INVALID_IS_BUILTIN',
      'invalid isBuiltin flag in query',
    );

    const where: Prisma.PermissionGroupWhereInput = {
      ...(status ? { status } : {}),
      ...(groupType ? { groupType } : {}),
      ...(isBuiltin === undefined ? {} : { isBuiltin }),
      ...(search
        ? {
            OR: [
              { groupKey: { contains: search } },
              { groupName: { contains: search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.permissionGroup.findMany({
        where,
        include: {
          _count: {
            select: {
              items: true,
              menuBindings: true,
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.permissionGroup.count({ where }),
    ]);

    return buildPaginatedResult({
      items: rows.map((row) => ({
        permissionGroupId: row.id,
        groupKey: row.groupKey,
        groupName: row.groupName,
        groupType: row.groupType,
        description: row.description ?? null,
        status: row.status,
        isBuiltin: row.isBuiltin,
        sortOrder: row.sortOrder,
        permissionCount: row._count.items,
        menuCount: row._count.menuBindings,
        createdAt: toTimestamp(row.createdAt),
        updatedAt: toTimestamp(row.updatedAt),
      })),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 查询权限组详情。
   */
  async getPermissionGroupById(
    permissionGroupId: string,
  ): Promise<AdminPermissionGroupDetail> {
    const row = await this.prisma.permissionGroup.findUnique({
      where: { id: this.requireId(permissionGroupId, 'permission group') },
      include: {
        items: {
          include: {
            permission: true,
          },
          orderBy: {
            permission: {
              sortOrder: 'asc',
            },
          },
        },
        menuBindings: {
          include: {
            menu: true,
          },
          orderBy: {
            menu: {
              sortOrder: 'asc',
            },
          },
        },
      },
    });

    if (!row) {
      throw new BizError({
        code: 'PERMISSION_GROUP_NOT_FOUND',
        message: 'permission group not found',
        status: 404,
      });
    }

    return {
      permissionGroupId: row.id,
      groupKey: row.groupKey,
      groupName: row.groupName,
      groupType: row.groupType,
      description: row.description ?? null,
      status: row.status,
      isBuiltin: row.isBuiltin,
      sortOrder: row.sortOrder,
      permissions: row.items.map((item) => ({
        permissionId: item.permission.id,
        permissionKey: item.permission.permissionKey,
        permissionName: item.permission.permissionName,
        permissionType: item.permission.permissionType,
        status: item.permission.status,
      })),
      menus: row.menuBindings.map((item) => ({
        menuId: item.menu.id,
        menuKey: item.menu.menuKey,
        menuName: item.menu.menuName,
        menuType: item.menu.menuType,
        status: item.menu.status,
      })),
      createdAt: toTimestamp(row.createdAt),
      updatedAt: toTimestamp(row.updatedAt),
    };
  }

  /**
   * 保存权限组成员。
   * 权限组仅负责组织与展示，不直接作为接口放行真相源。
   */
  async updatePermissionGroupPermissions(
    permissionGroupId: string,
    payload: UpdatePermissionGroupPermissionsRequest,
    operatorAdminUserId: string | null,
  ): Promise<UpdatePermissionGroupPermissionsResponseData> {
    const normalizedPermissionGroupId = this.requireId(
      permissionGroupId,
      'permission group',
    );
    const operatorId = this.requireId(
      operatorAdminUserId ?? '',
      'operator admin user',
    );
    const input = parseWithSchema(updatePermissionGroupPermissionsSchema, payload);
    const permissionIds = [...new Set(input.permissionIds)].sort();

    const permissionGroup = await this.prisma.permissionGroup.findUnique({
      where: { id: normalizedPermissionGroupId },
      include: {
        items: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!permissionGroup) {
      throw new BizError({
        code: 'PERMISSION_GROUP_NOT_FOUND',
        message: 'permission group not found',
        status: 404,
      });
    }

    const permissions =
      permissionIds.length > 0
        ? await this.prisma.permission.findMany({
            where: {
              id: { in: permissionIds },
            },
          })
        : [];

    if (permissions.length !== permissionIds.length) {
      throw new BizError({
        code: 'PERMISSION_NOT_FOUND',
        message: 'one or more permissions do not exist',
      });
    }

    const disabledPermission = permissions.find(
      (permission) => permission.status !== PermissionStatus.ENABLED,
    );
    if (disabledPermission) {
      throw new BizError({
        code: 'PERMISSION_DISABLED',
        message: 'disabled permission cannot be bound to permission group',
        status: 409,
      });
    }

    const wildcardPermission = permissions.find(
      (permission) => permission.permissionKey === ADMIN_PERMISSION_WILDCARD,
    );
    if (wildcardPermission) {
      throw new BizError({
        code: 'PERMISSION_WILDCARD_FORBIDDEN',
        message: 'wildcard permission cannot be bound to permission group',
        status: 409,
      });
    }

    const currentPermissionIds = permissionGroup.items
      .map((item) => item.permissionId)
      .sort();
    const unchanged =
      currentPermissionIds.length === permissionIds.length &&
      currentPermissionIds.every(
        (currentPermissionId, index) => currentPermissionId === permissionIds[index],
      );

    if (unchanged) {
      return {
        permissionGroupId: permissionGroup.id,
        groupKey: permissionGroup.groupKey,
        permissionIds,
        permissionKeys: permissionGroup.items
          .map((item) => item.permission.permissionKey)
          .sort(),
        updatedAt: toTimestamp(permissionGroup.updatedAt),
      };
    }

    const nextPermissionKeys = permissions.map((permission) => permission.permissionKey).sort();
    const handledAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.permissionGroupItem.deleteMany({
        where: { permissionGroupId: permissionGroup.id },
      });

      if (permissionIds.length > 0) {
        await tx.permissionGroupItem.createMany({
          data: permissionIds.map((resolvedPermissionId) => ({
            permissionGroupId: permissionGroup.id,
            permissionId: resolvedPermissionId,
          })),
        });
      }

      await tx.authorizationChangeLog.create({
        data: {
          targetType: AuthorizationChangeTargetType.PERMISSION_GROUP,
          targetId: permissionGroup.id,
          changeType: AuthorizationChangeType.REPLACE_BINDINGS,
          operatorAdminUserId: operatorId,
          beforeSnapshot: {
            permissionIds: currentPermissionIds,
            permissionKeys: permissionGroup.items
              .map((item) => item.permission.permissionKey)
              .sort(),
          },
          afterSnapshot: {
            permissionIds,
            permissionKeys: nextPermissionKeys,
          },
          changeReason: input.changeReason ?? null,
          createdAt: handledAt,
        },
      });
    });

    return {
      permissionGroupId: permissionGroup.id,
      groupKey: permissionGroup.groupKey,
      permissionIds,
      permissionKeys: nextPermissionKeys,
      updatedAt: toTimestamp(handledAt),
    };
  }

  /**
   * 分页查询菜单列表。
   */
  async listMenus(query: ListMenusQuery): Promise<ListMenusResponseData> {
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const search = query.search?.trim();
    const status = parseOptionalEnumValue(
      query.status,
      [MenuStatus.ENABLED, MenuStatus.DISABLED],
      'INVALID_MENU_STATUS',
      'invalid menu status in query',
    );
    const menuType = parseOptionalEnumValue(
      query.menuType,
      [MenuType.DIRECTORY, MenuType.PAGE, MenuType.EXTERNAL_LINK],
      'INVALID_MENU_TYPE',
      'invalid menu type in query',
    );
    const isBuiltin = this.parseOptionalBoolean(
      query.isBuiltin,
      'INVALID_IS_BUILTIN',
      'invalid isBuiltin flag in query',
    );
    const rootOnly = this.parseOptionalBoolean(
      query.rootOnly,
      'INVALID_ROOT_ONLY',
      'invalid rootOnly flag in query',
    );
    const parentId = query.parentId?.trim();

    const where: Prisma.MenuWhereInput = {
      ...(status ? { status } : {}),
      ...(menuType ? { menuType } : {}),
      ...(isBuiltin === undefined ? {} : { isBuiltin }),
      ...(rootOnly ? { parentId: null } : parentId ? { parentId } : {}),
      ...(search
        ? {
            OR: [
              { menuKey: { contains: search } },
              { menuName: { contains: search } },
              { routePath: { contains: search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.menu.findMany({
        where,
        include: {
          _count: {
            select: {
              children: true,
              permissionGroups: true,
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.menu.count({ where }),
    ]);

    return buildPaginatedResult({
      items: rows.map((row) => this.toMenuListItem(row)),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 查询菜单详情。
   */
  async getMenuById(menuId: string): Promise<AdminMenuDetail> {
    const row = await this.prisma.menu.findUnique({
      where: { id: this.requireId(menuId, 'menu') },
      include: {
        parent: {
          select: {
            id: true,
            menuName: true,
          },
        },
        children: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            menuKey: true,
            menuName: true,
            menuType: true,
            status: true,
            sortOrder: true,
          },
        },
        permissionGroups: {
          include: {
            permissionGroup: true,
          },
          orderBy: {
            permissionGroup: {
              sortOrder: 'asc',
            },
          },
        },
      },
    });

    if (!row) {
      throw new BizError({
        code: 'MENU_NOT_FOUND',
        message: 'menu not found',
        status: 404,
      });
    }

    return {
      menuId: row.id,
      parentId: row.parentId ?? null,
      parentName: row.parent?.menuName ?? null,
      menuKey: row.menuKey,
      menuName: row.menuName,
      menuType: row.menuType,
      routePath: row.routePath ?? null,
      iconName: row.iconName ?? null,
      status: row.status,
      isBuiltin: row.isBuiltin,
      sortOrder: row.sortOrder,
      permissionGroups: row.permissionGroups.map((item) => ({
        permissionGroupId: item.permissionGroup.id,
        groupKey: item.permissionGroup.groupKey,
        groupName: item.permissionGroup.groupName,
        status: item.permissionGroup.status,
      })),
      children: row.children.map((item) => ({
        menuId: item.id,
        menuKey: item.menuKey,
        menuName: item.menuName,
        menuType: item.menuType,
        status: item.status,
        sortOrder: item.sortOrder,
      })),
      createdAt: toTimestamp(row.createdAt),
      updatedAt: toTimestamp(row.updatedAt),
    };
  }

  /**
   * 保存菜单权限组绑定。
   */
  async updateMenuPermissionGroups(
    menuId: string,
    payload: UpdateMenuPermissionGroupsRequest,
    operatorAdminUserId: string | null,
  ): Promise<UpdateMenuPermissionGroupsResponseData> {
    const normalizedMenuId = this.requireId(menuId, 'menu');
    const operatorId = this.requireId(operatorAdminUserId ?? '', 'operator admin user');
    const input = parseWithSchema(updateMenuPermissionGroupsSchema, payload);
    const permissionGroupIds = [...new Set(input.permissionGroupIds)].sort();

    const menu = await this.prisma.menu.findUnique({
      where: { id: normalizedMenuId },
      include: {
        permissionGroups: {
          include: {
            permissionGroup: true,
          },
        },
      },
    });

    if (!menu) {
      throw new BizError({
        code: 'MENU_NOT_FOUND',
        message: 'menu not found',
        status: 404,
      });
    }

    const groups =
      permissionGroupIds.length > 0
        ? await this.prisma.permissionGroup.findMany({
            where: {
              id: { in: permissionGroupIds },
            },
          })
        : [];

    if (groups.length !== permissionGroupIds.length) {
      throw new BizError({
        code: 'PERMISSION_GROUP_NOT_FOUND',
        message: 'one or more permission groups do not exist',
      });
    }

    const disabledGroup = groups.find(
      (group) => group.status !== PermissionGroupStatus.ENABLED,
    );
    if (disabledGroup) {
      throw new BizError({
        code: 'PERMISSION_GROUP_DISABLED',
        message: 'disabled permission group cannot be bound to menu',
        status: 409,
      });
    }

    const currentPermissionGroupIds = menu.permissionGroups
      .map((item) => item.permissionGroupId)
      .sort();
    const unchanged =
      currentPermissionGroupIds.length === permissionGroupIds.length &&
      currentPermissionGroupIds.every(
        (permissionGroupId, index) => permissionGroupId === permissionGroupIds[index],
      );

    if (unchanged) {
      return {
        menuId: menu.id,
        menuKey: menu.menuKey,
        permissionGroupIds,
        permissionGroupKeys: menu.permissionGroups
          .map((item) => item.permissionGroup.groupKey)
          .sort(),
        updatedAt: toTimestamp(menu.updatedAt),
      };
    }

    const nextPermissionGroupKeys = groups.map((group) => group.groupKey).sort();
    const handledAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.menuPermissionGroup.deleteMany({
        where: { menuId: menu.id },
      });

      if (permissionGroupIds.length > 0) {
        await tx.menuPermissionGroup.createMany({
          data: permissionGroupIds.map((permissionGroupId) => ({
            menuId: menu.id,
            permissionGroupId,
          })),
        });
      }

      await tx.authorizationChangeLog.create({
        data: {
          targetType: AuthorizationChangeTargetType.MENU,
          targetId: menu.id,
          changeType: AuthorizationChangeType.REPLACE_BINDINGS,
          operatorAdminUserId: operatorId,
          beforeSnapshot: {
            permissionGroupIds: currentPermissionGroupIds,
            permissionGroupKeys: menu.permissionGroups
              .map((item) => item.permissionGroup.groupKey)
              .sort(),
          },
          afterSnapshot: {
            permissionGroupIds,
            permissionGroupKeys: nextPermissionGroupKeys,
          },
          changeReason: input.changeReason ?? null,
          createdAt: handledAt,
        },
      });
    });

    return {
      menuId: menu.id,
      menuKey: menu.menuKey,
      permissionGroupIds,
      permissionGroupKeys: nextPermissionGroupKeys,
      updatedAt: toTimestamp(handledAt),
    };
  }

  private toAdminUserListItem(row: AdminUserListRow): AdminUserListItem {
    return {
      adminUserId: row.id,
      accountNo: row.accountNo,
      username: row.username,
      displayName: row.displayName,
      status: row.status,
      authzVersion: row.authzVersion,
      roleKeys: row.roles.map((item) => item.role.roleKey),
      lastLoginAt: toNullableTimestamp(row.lastLoginAt),
      createdAt: toTimestamp(row.createdAt),
      updatedAt: toTimestamp(row.updatedAt),
    };
  }

  private toMenuListItem(row: {
    id: string;
    parentId: string | null;
    menuKey: string;
    menuName: string;
    menuType: MenuType;
    routePath: string | null;
    iconName: string | null;
    status: MenuStatus;
    isBuiltin: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    _count: {
      children: number;
      permissionGroups: number;
    };
  }): AdminMenuListItem {
    return {
      menuId: row.id,
      parentId: row.parentId,
      menuKey: row.menuKey,
      menuName: row.menuName,
      menuType: row.menuType,
      routePath: row.routePath ?? null,
      iconName: row.iconName ?? null,
      status: row.status,
      isBuiltin: row.isBuiltin,
      sortOrder: row.sortOrder,
      permissionGroupCount: row._count.permissionGroups,
      childCount: row._count.children,
      createdAt: toTimestamp(row.createdAt),
      updatedAt: toTimestamp(row.updatedAt),
    };
  }

  private collectPermissionKeys(row: AdminUserDetailRow): string[] {
    const keys = new Set<string>();

    for (const roleRef of row.roles) {
      if (roleRef.role.status !== RoleStatus.ENABLED) {
        continue;
      }

      for (const rolePermission of roleRef.role.permissions) {
        keys.add(rolePermission.permission.permissionKey);
      }
    }

    if (keys.has(ADMIN_PERMISSION_WILDCARD)) {
      return [ADMIN_PERMISSION_WILDCARD];
    }

    return [...keys].sort();
  }

  private async resolveAuthorizationTargets(
    rows: Array<{
      targetType: AuthorizationChangeTargetType
      targetId: string
    }>,
  ): Promise<Map<string, { targetKey: string | null; targetName: string | null }>> {
    const targetMap = new Map<
      string,
      { targetKey: string | null; targetName: string | null }
    >()
    const idsByType = new Map<AuthorizationChangeTargetType, Set<string>>()

    for (const row of rows) {
      const current = idsByType.get(row.targetType) ?? new Set<string>()
      current.add(row.targetId)
      idsByType.set(row.targetType, current)
    }

    const [
      adminUsers,
      roles,
      permissions,
      permissionGroups,
      menus,
    ] = await Promise.all([
      idsByType.has(AuthorizationChangeTargetType.ADMIN_USER)
        ? this.prisma.adminUser.findMany({
            where: {
              id: {
                in: [...(idsByType.get(AuthorizationChangeTargetType.ADMIN_USER) ?? [])],
              },
            },
            select: {
              id: true,
              accountNo: true,
              displayName: true,
            },
          })
        : Promise.resolve([]),
      idsByType.has(AuthorizationChangeTargetType.ROLE)
        ? this.prisma.role.findMany({
            where: {
              id: { in: [...(idsByType.get(AuthorizationChangeTargetType.ROLE) ?? [])] },
            },
            select: {
              id: true,
              roleKey: true,
              roleName: true,
            },
          })
        : Promise.resolve([]),
      idsByType.has(AuthorizationChangeTargetType.PERMISSION)
        ? this.prisma.permission.findMany({
            where: {
              id: {
                in: [...(idsByType.get(AuthorizationChangeTargetType.PERMISSION) ?? [])],
              },
            },
            select: {
              id: true,
              permissionKey: true,
              permissionName: true,
            },
          })
        : Promise.resolve([]),
      idsByType.has(AuthorizationChangeTargetType.PERMISSION_GROUP)
        ? this.prisma.permissionGroup.findMany({
            where: {
              id: {
                in: [
                  ...(idsByType.get(AuthorizationChangeTargetType.PERMISSION_GROUP) ?? []),
                ],
              },
            },
            select: {
              id: true,
              groupKey: true,
              groupName: true,
            },
          })
        : Promise.resolve([]),
      idsByType.has(AuthorizationChangeTargetType.MENU)
        ? this.prisma.menu.findMany({
            where: {
              id: { in: [...(idsByType.get(AuthorizationChangeTargetType.MENU) ?? [])] },
            },
            select: {
              id: true,
              menuKey: true,
              menuName: true,
            },
          })
        : Promise.resolve([]),
    ])

    for (const row of adminUsers) {
      targetMap.set(`${AuthorizationChangeTargetType.ADMIN_USER}:${row.id}`, {
        targetKey: row.accountNo,
        targetName: row.displayName,
      })
    }
    for (const row of roles) {
      targetMap.set(`${AuthorizationChangeTargetType.ROLE}:${row.id}`, {
        targetKey: row.roleKey,
        targetName: row.roleName,
      })
    }
    for (const row of permissions) {
      targetMap.set(`${AuthorizationChangeTargetType.PERMISSION}:${row.id}`, {
        targetKey: row.permissionKey,
        targetName: row.permissionName,
      })
    }
    for (const row of permissionGroups) {
      targetMap.set(`${AuthorizationChangeTargetType.PERMISSION_GROUP}:${row.id}`, {
        targetKey: row.groupKey,
        targetName: row.groupName,
      })
    }
    for (const row of menus) {
      targetMap.set(`${AuthorizationChangeTargetType.MENU}:${row.id}`, {
        targetKey: row.menuKey,
        targetName: row.menuName,
      })
    }

    return targetMap
  }

  private parseOptionalBoolean(
    value: string | boolean | undefined,
    code: string,
    message: string,
  ): boolean | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }

    throw new BizError({
      code,
      message,
    });
  }

  private requireId(value: string, label: string): string {
    const id = value?.trim();
    if (!id) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: `${label} id is required`,
      });
    }

    return id;
  }
}
