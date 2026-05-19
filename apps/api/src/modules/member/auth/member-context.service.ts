import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Member, MemberStatus } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { BizError } from '../../../common/http/biz-error';
import { PrismaService } from '../../../platform/prisma/prisma.service';

/**
 * 会员上下文服务。
 * 统一负责解析会员身份并校验会员账号状态，避免各会员模块重复实现。
 */
@Injectable()
export class MemberContextService {
  private readonly logger = new Logger(MemberContextService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService?: ConfigService,
  ) {}

  /**
   * 根据请求上下文获取当前有效会员。
   * 当前仅接受 Bearer access token，并在服务端统一校验会员状态。
   */
  async getCurrentActiveMember(authContext: {
    memberId?: string;
    authorization?: string;
  }): Promise<Member> {
    const memberId = this.resolveMemberId(authContext);
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      this.logger.warn('member context resolve failed: member missing', {
        event: 'member.context.unauthorized',
        code: 'UNAUTHORIZED',
        memberId,
      });
      throw new BizError({
        code: 'UNAUTHORIZED',
        message: 'member context missing',
        status: 401,
      });
    }

    this.ensureMemberActive(member);

    return member;
  }

  /**
   * 解析当前会员身份。
   * Bearer token 优先，确保正式登录态不会被请求头中的临时字段覆盖。
   * 历史 mock token 仍保持兼容解析，便于平滑迁移已存量的本地会话。
   */
  private resolveMemberId(authContext: {
    memberId?: string;
    authorization?: string;
  }): string {
    const authorization = authContext.authorization?.trim();
    const bearerPrefix = 'Bearer ';

    if (authorization?.startsWith(bearerPrefix)) {
      const token = authorization.slice(bearerPrefix.length);
      const jwtMemberId = this.resolveMemberIdFromJwt(token);

      if (jwtMemberId) {
        return jwtMemberId;
      }

      const legacyMemberId = this.resolveMemberIdFromLegacyMockToken(token);

      if (legacyMemberId) {
        return legacyMemberId;
      }

      throw new BizError({
        code: 'UNAUTHORIZED',
        message: 'invalid member token',
        status: 401,
      });
    }

    throw new BizError({
      code: 'UNAUTHORIZED',
      message: 'member context missing',
      status: 401,
    });
  }

  private resolveMemberIdFromJwt(token: string): string | null {
    try {
      const payload = jwt.verify(token, this.getJwtSecret());

      if (!payload || typeof payload !== 'object') {
        return null;
      }

      if (payload.typ !== 'member' || typeof payload.sub !== 'string') {
        return null;
      }

      const memberId = payload.sub.trim();
      return memberId || null;
    } catch {
      return null;
    }
  }

  private resolveMemberIdFromLegacyMockToken(token: string): string | null {
    const tokenPrefix = 'mock-member-token:';

    if (token.startsWith(tokenPrefix)) {
      const memberId = token.slice(tokenPrefix.length).trim();

      if (memberId) {
        return memberId;
      }
    }

    return null;
  }

  private getJwtSecret(): string {
    const secret =
      this.configService?.get<string>('MEMBER_JWT_SECRET') ??
      'dev-member-jwt-secret-change-me';

    if (secret.length < 16) {
      throw new BizError({
        code: 'MEMBER_JWT_SECRET_INVALID',
        message: 'MEMBER_JWT_SECRET must be at least 16 characters',
        status: 500,
      });
    }

    return secret;
  }

  /**
   * 校验会员是否仍然可用。
   */
  private ensureMemberActive(member: Member) {
    if (member.status !== MemberStatus.ACTIVE) {
      this.logger.warn('member context blocked: account frozen', {
        event: 'member.context.frozen',
        code: 'MEMBER_ACCOUNT_FROZEN',
        memberId: member.id,
        accountStatus: member.status,
      });
      throw new BizError({
        code: 'MEMBER_ACCOUNT_FROZEN',
        message: 'member account frozen',
      });
    }
  }
}
