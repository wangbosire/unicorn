import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { BizError } from '../../../common/http/biz-error';
import {
  ADMIN_REQUIRED_PERMISSIONS_KEY,
} from './admin-permissions.decorator';
import type { AdminHttpRequest } from './admin-http.types';

type AdminJwtPayload = {
  sub: string;
  username: string;
  accountNo: string;
  permissionKeys: string[];
  typ: 'admin';
};

/**
 * 后台 JWT 鉴权与权限校验守卫。
 * 未声明 `@RequireAdminPermissions` 时仅校验登录态。
 */
@Injectable()
export class AdminAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AdminHttpRequest>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new BizError({
        code: 'ADMIN_AUTH_TOKEN_MISSING',
        message: 'missing admin authorization token',
        status: 401,
      });
    }

    const secret = this.getJwtSecret();
    let payload: AdminJwtPayload;

    try {
      payload = jwt.verify(token, secret) as AdminJwtPayload;
    } catch {
      throw new BizError({
        code: 'ADMIN_AUTH_TOKEN_INVALID',
        message: 'invalid or expired admin token',
        status: 401,
      });
    }

    if (payload.typ !== 'admin' || !payload.sub) {
      throw new BizError({
        code: 'ADMIN_AUTH_TOKEN_INVALID',
        message: 'invalid admin token payload',
        status: 401,
      });
    }

    const permissionKeys = Array.isArray(payload.permissionKeys)
      ? payload.permissionKeys
      : [];

    request.admin = {
      id: payload.sub,
      username: payload.username,
      accountNo: payload.accountNo,
      permissionKeys,
    };

    const required =
      this.reflector.getAllAndOverride<string[]>(
        ADMIN_REQUIRED_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (required.length === 0) {
      return true;
    }

    if (permissionKeys.includes('*')) {
      return true;
    }

    const allowed = required.every((key) => permissionKeys.includes(key));

    if (!allowed) {
      throw new BizError({
        code: 'ADMIN_AUTH_FORBIDDEN',
        message: 'insufficient admin permissions',
        status: 403,
      });
    }

    return true;
  }

  private extractBearerToken(
    authorization: string | undefined,
  ): string | null {
    if (!authorization) {
      return null;
    }

    const [scheme, raw] = authorization.split(' ');

    if (!scheme || scheme.toLowerCase() !== 'bearer' || !raw) {
      return null;
    }

    return raw.trim();
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
