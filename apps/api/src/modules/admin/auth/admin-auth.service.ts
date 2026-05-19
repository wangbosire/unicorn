import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AdminUserStatus,
  MenuStatus,
  MenuType,
  Prisma,
  RoleStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import type {
  AdminAuthUser,
  AdminGetNavigationResponseData,
  AdminGetMeResponseData,
  AdminLoginRequest,
  AdminLoginResponseData,
  AdminLogoutResponseData,
} from '@contracts/admin/auth';
import { BizError } from '../../../common/http/biz-error';
import { PrismaService } from '../../../platform/prisma/prisma.service';
import { ADMIN_PERMISSION_WILDCARD } from './admin-permission-keys';
import { toNullableTimestamp } from '../../../common/serializers/timestamp';

const adminUserInclude = {
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

type AdminUserWithRoles = Prisma.AdminUserGetPayload<{
  include: typeof adminUserInclude;
}>;

/**
 * 后台认证服务：账号密码登录、JWT 签发与当前用户视图组装。
 */
@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 用户名密码登录，返回访问令牌与用户信息（含权限点）。
   */
  async login(payload: AdminLoginRequest): Promise<AdminLoginResponseData> {
    const username = payload.username?.trim();

    if (!username || !payload.password) {
      this.logger.warn('admin login rejected: missing credentials', {
        event: 'admin.auth.login.rejected',
        code: 'VALIDATION_ERROR',
      });
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'username and password are required',
        status: 400,
      });
    }

    const user = await this.prisma.adminUser.findUnique({
      where: { username },
      include: adminUserInclude,
    });

    if (!user) {
      this.logger.warn('admin login rejected: user not found', {
        event: 'admin.auth.login.rejected',
        code: 'ADMIN_AUTH_INVALID_CREDENTIALS',
        username,
      });
      throw new BizError({
        code: 'ADMIN_AUTH_INVALID_CREDENTIALS',
        message: 'invalid admin username or password',
        status: 401,
      });
    }

    if (user.status !== AdminUserStatus.ACTIVE) {
      this.logger.warn('admin login rejected: account disabled', {
        event: 'admin.auth.login.rejected',
        code: 'ADMIN_ACCOUNT_DISABLED',
        adminUserId: user.id,
        accountStatus: user.status,
      });
      throw new BizError({
        code: 'ADMIN_ACCOUNT_DISABLED',
        message: 'admin account is disabled',
        status: 403,
      });
    }

    const passwordOk = await bcrypt.compare(payload.password, user.passwordHash);

    if (!passwordOk) {
      this.logger.warn('admin login rejected: invalid password', {
        event: 'admin.auth.login.rejected',
        code: 'ADMIN_AUTH_INVALID_CREDENTIALS',
        adminUserId: user.id,
      });
      throw new BizError({
        code: 'ADMIN_AUTH_INVALID_CREDENTIALS',
        message: 'invalid admin username or password',
        status: 401,
      });
    }

    const permissionKeys = this.collectPermissionKeys(user);
    const roles = user.roles.map((ur) => ur.role.roleKey);
    const accessToken = this.signAccessToken({
      sub: user.id,
      username: user.username,
      accountNo: user.accountNo,
      authzVersion: user.authzVersion,
      permissionKeys,
    });

    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log('admin login succeeded', {
      event: 'admin.auth.login.succeeded',
      adminUserId: user.id,
      accountNo: user.accountNo,
      roleCount: roles.length,
    });

    return {
      accessToken,
      user: this.toAuthUser(user, roles, permissionKeys),
    };
  }

  /**
   * 根据 JWT 上下文回源数据库，组装「当前用户」完整视图（含角色与权限）。
   */
  async buildMeResponseHydrated(admin: {
    id: string;
    username: string;
    accountNo: string;
    authzVersion: number;
    permissionKeys: string[];
  }): Promise<AdminGetMeResponseData> {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: admin.id },
      include: adminUserInclude,
    });

    if (!user || user.status !== AdminUserStatus.ACTIVE) {
      throw new BizError({
        code: 'ADMIN_ACCOUNT_DISABLED',
        message: 'admin account is disabled or removed',
        status: 403,
      });
    }

    const roles = user.roles.map((ur) => ur.role.roleKey);
    const permissionKeys = this.collectPermissionKeys(user);

    return {
      user: this.toAuthUser(user, roles, permissionKeys),
    };
  }

  /**
   * 后台退出登录。
   * 当前 JWT 为无状态实现，这里返回统一成功响应，由客户端自行清理令牌。
   */
  logout(): AdminLogoutResponseData {
    return { success: true };
  }

  /**
   * 计算当前登录后台用户的可见导航菜单。
   * 仅返回已启用菜单、命中有效权限组的页面节点，以及展示所需的祖先目录。
   */
  async buildNavigationResponse(admin: {
    id: string;
    username: string;
    accountNo: string;
    authzVersion: number;
    permissionKeys: string[];
  }): Promise<AdminGetNavigationResponseData> {
    const rows = await this.prisma.menu.findMany({
      where: { status: MenuStatus.ENABLED },
      include: {
        permissionGroups: {
          include: {
            permissionGroup: {
              include: {
                items: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const permissionSet = new Set(admin.permissionKeys);
    const hasWildcardPermission = permissionSet.has(ADMIN_PERMISSION_WILDCARD);
    const menuById = new Map(rows.map((row) => [row.id, row]));
    const visibleMenuIds = new Set<string>();
    const warnings = new Set<string>();

    for (const row of rows) {
      const enabledBindings = row.permissionGroups.filter(
        (item) => item.permissionGroup.status === 'ENABLED',
      );
      const disabledBindings = row.permissionGroups.filter(
        (item) => item.permissionGroup.status !== 'ENABLED',
      );

      if (enabledBindings.length === 0) {
        warnings.add(
          `菜单 ${row.menuKey} 未绑定有效权限组，已在导航中自动隐藏。`,
        );
        continue;
      }

      if (disabledBindings.length > 0) {
        warnings.add(
          `菜单 ${row.menuKey} 绑定了失效权限组 ${disabledBindings
            .map((item) => item.permissionGroup.groupKey)
            .sort()
            .join('、')}，运行时已按有效组重新计算可见性。`,
        );
      }

      const matched =
        hasWildcardPermission ||
        enabledBindings.some((binding) =>
          binding.permissionGroup.items.some((item) => {
            if (item.permission.status !== 'ENABLED') {
              return false;
            }
            return permissionSet.has(item.permission.permissionKey);
          }),
        );

      if (matched) {
        visibleMenuIds.add(row.id);
      }
    }

    const includedMenuIds = new Set<string>();
    const includeMenuAndAncestors = (menuId: string) => {
      let current = menuById.get(menuId);
      while (current) {
        if (includedMenuIds.has(current.id)) {
          return;
        }
        includedMenuIds.add(current.id);
        current = current.parentId ? menuById.get(current.parentId) : undefined;
      }
    };

    for (const menuId of visibleMenuIds) {
      includeMenuAndAncestors(menuId);
    }

    return {
      menus: rows
        .filter((row) => includedMenuIds.has(row.id))
        .map((row) => ({
          menuId: row.id,
          parentId: row.parentId ?? null,
          menuKey: row.menuKey,
          menuName: row.menuName,
          menuType: row.menuType,
          routePath:
            row.menuType === MenuType.DIRECTORY ? null : (row.routePath ?? null),
          iconName: row.iconName ?? null,
          sortOrder: row.sortOrder,
        })),
      warnings: [...warnings].sort(),
    };
  }

  private toAuthUser(
    user: AdminUserWithRoles,
    roles: string[],
    permissionKeys: string[],
  ): AdminAuthUser {
    return {
      id: user.id,
      accountNo: user.accountNo,
      username: user.username,
      displayName: user.displayName,
      status: user.status,
      lastLoginAt: toNullableTimestamp(user.lastLoginAt),
      roleNames: user.roles.map((ur) => ur.role.roleName),
      roles,
      permissionKeys,
      reviewedContentCount: user.reviewedItems.length,
      reviewedCommentCount: user.reviewedComments.length,
    };
  }

  private collectPermissionKeys(user: AdminUserWithRoles): string[] {
    const keys = new Set<string>();

    for (const ur of user.roles) {
      if (ur.role.status !== RoleStatus.ENABLED) {
        continue;
      }

      for (const rp of ur.role.permissions) {
        keys.add(rp.permission.permissionKey);
      }
    }

    if (keys.has(ADMIN_PERMISSION_WILDCARD)) {
      return [ADMIN_PERMISSION_WILDCARD];
    }

    return [...keys].sort();
  }

  private signAccessToken(payload: {
    sub: string;
    username: string;
    accountNo: string;
    authzVersion: number;
    permissionKeys: string[];
  }): string {
    const secret = this.getJwtSecret();

    return jwt.sign(
      {
        sub: payload.sub,
        username: payload.username,
        accountNo: payload.accountNo,
        authzVersion: payload.authzVersion,
        permissionKeys: payload.permissionKeys,
        typ: 'admin' as const,
      },
      secret,
      { expiresIn: '12h', algorithm: 'HS256' },
    );
  }

  private getJwtSecret(): string {
    const secret =
      this.configService.get<string>('ADMIN_JWT_SECRET') ??
      'dev-admin-jwt-secret-change-me';

    if (secret.length < 16) {
      throw new BizError({
        code: 'ADMIN_JWT_SECRET_INVALID',
        message: 'ADMIN_JWT_SECRET must be at least 16 characters',
        status: 500,
      });
    }

    return secret;
  }
}
