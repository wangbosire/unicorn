import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Member, MemberStatus, Prisma, WechatChannelType } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { BizError } from '../../../common/http/biz-error';
import { PrismaService } from '../../../platform/prisma/prisma.service';
import type {
  CurrentMember,
  GetCurrentMemberResponseData,
  WechatMiniappLoginRequest,
  WechatMiniappLoginResponseData,
} from '@contracts/member/auth';
import { MemberContextService } from './member-context.service';
import { toTimestamp } from '../../../common/serializers/timestamp';

/**
 * 会员认证服务。
 * 当前实现：使用 `Taro.login` 的临时 code 映射稳定 openid，完成会员创建/绑定并签发正式 JWT；
 * 后续若切换真实微信 `code2Session`，可保持接口路径与令牌承载方式不变。
 */
@Injectable()
export class MemberAuthService {
  private readonly logger = new Logger(MemberAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly memberContextService: MemberContextService,
    private readonly configService?: ConfigService,
  ) {}

  /**
   * 通过微信小程序临时 code 登录。
   * 当前阶段会将 code 映射为稳定 openid，以便前后端先完成登录闭环。
   */
  async loginWithWechatMiniapp(
    payload: WechatMiniappLoginRequest,
  ): Promise<WechatMiniappLoginResponseData> {
    return this.loginWithWechatCode(payload.code, WechatChannelType.MINIAPP);
  }

  /**
   * 通过微信公众号临时 code 登录。
   * 当前与小程序共享 JWT 签发与账号绑定流程，仅渠道类型不同。
   */
  async loginWithWechatMp(
    payload: WechatMiniappLoginRequest,
  ): Promise<WechatMiniappLoginResponseData> {
    return this.loginWithWechatCode(payload.code, WechatChannelType.MP);
  }

  /**
   * 统一处理微信渠道登录。
   */
  private async loginWithWechatCode(
    rawCode: string | undefined,
    channelType: WechatChannelType,
  ): Promise<WechatMiniappLoginResponseData> {
    const loginCode = rawCode?.trim();

    if (!loginCode) {
      this.logger.warn('member login rejected: missing code', {
        event: 'member.auth.login.rejected',
        code: 'VALIDATION_ERROR',
        channelType,
      });
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'wechat login code is required',
      });
    }

    const openid = this.buildWechatOpenid(channelType, loginCode);
    const existingBinding = await this.prisma.memberWechatBinding.findUnique({
      where: {
        channelType_openid: {
          channelType,
          openid,
        },
      },
      include: {
        member: {
          include: {
            _count: {
              select: {
                wechatBindings: true,
                ownedCollections: true,
                comments: true,
              },
            },
          },
        },
      },
    });

    if (existingBinding) {
      this.ensureMemberActive(existingBinding.member);

      this.logger.log('member login succeeded (existing)', {
        event: 'member.auth.login.succeeded',
        memberId: existingBinding.member.id,
        memberNo: existingBinding.member.memberNo,
        channelType,
        firstTime: false,
      });

      return {
        accessToken: this.signAccessToken(existingBinding.member),
        member: this.toCurrentMember(existingBinding.member),
      };
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const memberNo = await this.generateMemberNo(tx);
      const createdMember = await tx.member.create({
        data: {
          memberNo,
          nickname: `微信用户${memberNo.slice(-4)}`,
          avatarUrl: null,
          status: MemberStatus.ACTIVE,
        },
      });

      await tx.memberWechatBinding.create({
        data: {
          memberId: createdMember.id,
          channelType,
          openid,
        },
      });

      return tx.member.findUnique({
        where: { id: createdMember.id },
        include: {
          _count: {
            select: {
              wechatBindings: true,
              ownedCollections: true,
              comments: true,
            },
          },
        },
      });
    });

    if (!member) {
      throw new BizError({
        code: 'INTERNAL_ERROR',
        message: 'member created but reloading failed',
        status: 500,
      });
    }

    this.logger.log('member login succeeded (new)', {
      event: 'member.auth.login.succeeded',
      memberId: member.id,
      memberNo: member.memberNo,
      channelType,
      firstTime: true,
    });

    return {
      accessToken: this.signAccessToken(member),
      member: this.toCurrentMember(member),
    };
  }

  /**
   * 获取当前会员信息。
   * 当前要求使用 Bearer access token 访问。
   */
  async getCurrentMember(authContext: {
    memberId?: string;
    authorization?: string;
  }): Promise<GetCurrentMemberResponseData> {
    const member = await this.memberContextService.getCurrentActiveMember(authContext);
    const hydratedMember = await this.prisma.member.findUnique({
      where: { id: member.id },
      include: {
        _count: {
          select: {
            wechatBindings: true,
            ownedCollections: true,
            comments: true,
          },
        },
      },
    });

    if (!hydratedMember) {
      throw new BizError({
        code: 'UNAUTHORIZED',
        message: 'member context missing',
        status: 401,
      });
    }

    return this.toCurrentMember(hydratedMember);
  }

  /**
   * 校验会员是否仍然可用。
   */
  private ensureMemberActive(member: Member) {
    if (member.status !== MemberStatus.ACTIVE) {
      this.logger.warn('member login rejected: account frozen', {
        event: 'member.auth.login.rejected',
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

  /**
   * 生成联调阶段使用的 mock openid。
   */
  private buildWechatOpenid(
    channelType: WechatChannelType,
    code: string,
  ): string {
    return `${
      channelType === WechatChannelType.MINIAPP ? 'miniapp-openid' : 'mp-openid'
    }:${code}`;
  }

  /**
   * 签发会员访问令牌。
   * 令牌声明中保留 `sub/memberNo/typ`，供后续资源访问时做统一校验。
   */
  private signAccessToken(member: Pick<Member, 'id' | 'memberNo'>): string {
    return jwt.sign(
      {
        sub: member.id,
        memberNo: member.memberNo,
        typ: 'member' as const,
      },
      this.getJwtSecret(),
      {
        expiresIn: '30d',
        algorithm: 'HS256',
      },
    );
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
   * 生成对外展示的会员编号。
   * 当前使用顺序号方案，满足初始化阶段的人读可辨识要求。
   */
  private async generateMemberNo(tx: Prisma.TransactionClient): Promise<string> {
    const memberCount = await tx.member.count();

    for (let offset = 1; offset <= 100; offset += 1) {
      const memberNo = `MEM${String(memberCount + offset).padStart(6, '0')}`;
      const existingMember = await tx.member.findUnique({
        where: { memberNo },
        select: { id: true },
      });

      if (!existingMember) {
        return memberNo;
      }
    }

    throw new BizError({
      code: 'MEMBER_NO_GENERATION_FAILED',
      message: 'member number generation failed',
      status: 500,
    });
  }

  /**
   * 转换为会员接口统一视图。
   */
  private toCurrentMember(
    member:
      | Member
      | Prisma.MemberGetPayload<{
          include: {
            _count: {
              select: {
                wechatBindings: true;
                ownedCollections: true;
                comments: true;
              };
            };
          };
        }>,
  ): CurrentMember {
    return {
      id: member.id,
      memberNo: member.memberNo,
      nickname: member.nickname,
      avatarUrl: member.avatarUrl ?? '',
      mobile: member.mobile ?? null,
      status: member.status,
      registeredAt: toTimestamp(member.registeredAt),
      wechatBindingCount: '_count' in member ? member._count.wechatBindings : 0,
      ownedCollectionCount: '_count' in member ? member._count.ownedCollections : 0,
      commentCount: '_count' in member ? member._count.comments : 0,
    };
  }
}
