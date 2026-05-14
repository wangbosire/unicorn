import { Injectable } from '@nestjs/common';
import { Member, MemberStatus, Prisma, WechatChannelType } from '@prisma/client';
import { BizError } from '../../../common/http/biz-error';
import { PrismaService } from '../../../platform/prisma/prisma.service';
import { MemberContextService } from './member-context.service';
import { WechatMiniappLoginRequestDto } from './dto/wechat-miniapp-login.request';
import {
  CurrentMemberDto,
  GetCurrentMemberResponseDataDto,
  WechatMiniappLoginResponseDataDto,
} from './dto/member-auth.response';

/**
 * 会员认证服务。
 * 当前提供 M1 联调所需的最小登录能力，后续可替换为真实微信登录和 JWT 方案。
 */
@Injectable()
export class MemberAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memberContextService: MemberContextService,
  ) {}

  /**
   * 通过微信小程序临时 code 登录。
   * 当前阶段会将 code 映射为稳定 openid，以便前后端先完成联调闭环。
   */
  async loginWithWechatMiniapp(
    payload: WechatMiniappLoginRequestDto,
  ): Promise<WechatMiniappLoginResponseDataDto> {
    const loginCode = payload.code?.trim();

    if (!loginCode) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'wechat miniapp login code is required',
      });
    }

    const openid = this.buildMiniappOpenid(loginCode);
    const existingBinding = await this.prisma.memberWechatBinding.findUnique({
      where: {
        channelType_openid: {
          channelType: WechatChannelType.MINIAPP,
          openid,
        },
      },
      include: {
        member: true,
      },
    });

    if (existingBinding) {
      this.ensureMemberActive(existingBinding.member);

      return {
        accessToken: this.buildMockAccessToken(existingBinding.member.id),
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
          channelType: WechatChannelType.MINIAPP,
          openid,
        },
      });

      return createdMember;
    });

    return {
      accessToken: this.buildMockAccessToken(member.id),
      member: this.toCurrentMember(member),
    };
  }

  /**
   * 获取当前会员信息。
   * 当前优先使用 x-member-id，其次回退到临时 mock access token。
   */
  async getCurrentMember(authContext: {
    memberId?: string;
    authorization?: string;
  }): Promise<GetCurrentMemberResponseDataDto> {
    const member = await this.memberContextService.getCurrentActiveMember(authContext);
    return this.toCurrentMember(member);
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

  /**
   * 生成联调阶段使用的 mock openid。
   */
  private buildMiniappOpenid(code: string): string {
    return `miniapp-openid:${code}`;
  }

  /**
   * 生成联调阶段使用的 mock access token。
   */
  private buildMockAccessToken(memberId: string): string {
    return `mock-member-token:${memberId}`;
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
  private toCurrentMember(member: Member): CurrentMemberDto {
    return {
      id: member.id,
      memberNo: member.memberNo,
      nickname: member.nickname,
      avatarUrl: member.avatarUrl ?? '',
      status: member.status,
    };
  }
}
