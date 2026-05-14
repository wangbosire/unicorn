import { Injectable } from '@nestjs/common';
import { Member, MemberStatus } from '@prisma/client';
import { BizError } from '../../../common/http/biz-error';
import { PrismaService } from '../../../platform/prisma/prisma.service';

/**
 * 会员上下文服务。
 * 统一负责解析会员身份并校验会员账号状态，避免各会员模块重复实现。
 */
@Injectable()
export class MemberContextService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 根据请求上下文获取当前有效会员。
   * 当前兼容 x-member-id 和 mock bearer token 两种身份来源。
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
   * 为兼容阶段性联调，这里允许 header 和 mock token 两种来源。
   */
  private resolveMemberId(authContext: {
    memberId?: string;
    authorization?: string;
  }): string {
    const headerMemberId = authContext.memberId?.trim();

    if (headerMemberId) {
      return headerMemberId;
    }

    const authorization = authContext.authorization?.trim();
    const bearerPrefix = 'Bearer ';

    if (authorization?.startsWith(bearerPrefix)) {
      const token = authorization.slice(bearerPrefix.length);
      const tokenPrefix = 'mock-member-token:';

      if (token.startsWith(tokenPrefix)) {
        const memberId = token.slice(tokenPrefix.length).trim();

        if (memberId) {
          return memberId;
        }
      }
    }

    throw new BizError({
      code: 'UNAUTHORIZED',
      message: 'member context missing',
      status: 401,
    });
  }

  /**
   * 校验会员是否仍然可用。
   */
  private ensureMemberActive(member: Member) {
    if (member.status !== MemberStatus.ACTIVE) {
      throw new BizError({
        code: 'MEMBER_ACCOUNT_FROZEN',
        message: 'member account frozen',
      });
    }
  }
}
