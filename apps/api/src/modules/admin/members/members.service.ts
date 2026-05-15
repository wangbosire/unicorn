import { Injectable } from '@nestjs/common';
import { MemberStatus, WechatChannelType } from '@prisma/client';
import { BizError } from '../../../common/http/biz-error';
import {
  buildPaginatedResult,
  parsePaginationQuery,
} from '../../../common/pagination/pagination';
import { toTimestamp } from '../../../common/serializers/timestamp';
import { parseOptionalEnumValue } from '../../../common/validation/enum';
import { PrismaService } from '../../../platform/prisma/prisma.service';
import type {
  AdminMemberListItem,
  ListMembersQuery,
  ListMembersResponseData,
  UpdateMemberStatusRequest,
  UpdateMemberStatusResponseData,
} from '@contracts/admin/members';

/**
 * 后台会员查询与状态管理服务。
 */
@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 分页查询会员列表，含微信绑定渠道摘要与持有藏品数。
   */
  async listMembers(query: ListMembersQuery): Promise<ListMembersResponseData> {
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const search = query.search?.trim();
    const status = this.parseMemberStatus(query.status);

    const where = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { memberNo: { contains: search, mode: 'insensitive' as const } },
              { nickname: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.member.findMany({
        where,
        include: {
          wechatBindings: { select: { channelType: true } },
          _count: { select: { ownedCollections: true } },
        },
        orderBy: { registeredAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.member.count({ where }),
    ]);

    return buildPaginatedResult({
      items: rows.map((row) => this.toAdminMemberListItem(row)),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 更新会员账号状态（冻结 / 解冻）。
   */
  async updateMemberStatus(
    memberId: string,
    payload: UpdateMemberStatusRequest,
  ): Promise<UpdateMemberStatusResponseData> {
    const id = memberId?.trim();
    if (!id) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'member id is required',
      });
    }

    const rawStatus = payload?.status;
    if (!rawStatus) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'status is required',
      });
    }

    const nextStatus = parseOptionalEnumValue(
      rawStatus,
      [MemberStatus.ACTIVE, MemberStatus.FROZEN],
      'INVALID_MEMBER_STATUS',
      'invalid member status in body',
    );

    const existing = await this.prisma.member.findUnique({
      where: { id },
      select: { id: true, memberNo: true },
    });

    if (!existing) {
      throw new BizError({
        code: 'MEMBER_NOT_FOUND',
        message: 'member not found',
        status: 404,
      });
    }

    const updated = await this.prisma.member.update({
      where: { id },
      data: { status: nextStatus },
      select: { id: true, memberNo: true, status: true, updatedAt: true },
    });

    return {
      memberId: updated.id,
      memberNo: updated.memberNo,
      status: updated.status,
      updatedAt: toTimestamp(updated.updatedAt),
    };
  }

  private toAdminMemberListItem(row: {
    id: string;
    memberNo: string;
    nickname: string;
    mobile: string | null;
    status: MemberStatus;
    registeredAt: Date;
    wechatBindings: { channelType: WechatChannelType }[];
    _count: { ownedCollections: number };
  }): AdminMemberListItem {
    return {
      memberId: row.id,
      memberNo: row.memberNo,
      nickname: row.nickname,
      mobile: row.mobile,
      status: row.status,
      registeredAt: toTimestamp(row.registeredAt),
      wechatChannelsSummary: this.formatWechatChannelsSummary(row.wechatBindings),
      ownedCollectionsCount: row._count.ownedCollections,
    };
  }

  /**
   * 将绑定渠道去重后拼成可读文案。
   */
  private formatWechatChannelsSummary(
    bindings: { channelType: WechatChannelType }[],
  ): string | null {
    if (!bindings.length) {
      return null;
    }
    const labels = new Set<string>();
    for (const binding of bindings) {
      labels.add(
        binding.channelType === WechatChannelType.MINIAPP ? '微信小程序' : '微信公众号',
      );
    }
    return [...labels].join('、');
  }

  private parseMemberStatus(value: string | undefined): MemberStatus | undefined {
    return parseOptionalEnumValue(
      value,
      [MemberStatus.ACTIVE, MemberStatus.FROZEN],
      'INVALID_MEMBER_STATUS',
      'invalid member status',
    );
  }
}
