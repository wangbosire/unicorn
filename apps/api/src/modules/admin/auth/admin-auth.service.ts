import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminUserStatus, Prisma, RoleStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import type {
  AdminAuthUser,
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
    permissionKeys: string[];
  }): string {
    const secret = this.getJwtSecret();

    return jwt.sign(
      {
        sub: payload.sub,
        username: payload.username,
        accountNo: payload.accountNo,
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
