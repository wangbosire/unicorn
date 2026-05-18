import { Injectable } from '@nestjs/common';
import type {
  ListMemberMessagesQuery,
  ListMemberMessagesResponseData,
  MarkMemberMessageReadParams,
  MarkMemberMessageReadResponseData,
  MemberMessageListItem,
} from '@contracts/member/messages';
import { buildPaginatedResult, parsePaginationQuery } from '../../../common/pagination/pagination';
import { toNullableTimestamp, toTimestamp } from '../../../common/serializers/timestamp';
import { BizError } from '../../../common/http/biz-error';
import { parseWithSchema } from '../../../common/validation/schema';
import { requiredIdField } from '../../../common/validation/fields';
import { PrismaService } from '../../../platform/prisma/prisma.service';
import { MemberContextService } from '../auth/member-context.service';
import { z } from 'zod';

const markMemberMessageReadParamsSchema = z.object({
  messageId: requiredIdField('message'),
});

const unreadOnlySchema = z
  .union([z.boolean(), z.literal('true'), z.literal('false')])
  .optional()
  .transform((value) => value === true || value === 'true');

/**
 * 当前会员消息服务。
 * 提供站内消息列表读取与已读状态更新。
 */
@Injectable()
export class MemberMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memberContextService: MemberContextService,
  ) {}

  /**
   * 查询当前会员消息列表。
   */
  async listMemberMessages(
    authContext: {
      memberId?: string;
      authorization?: string;
    },
    query: ListMemberMessagesQuery,
  ): Promise<ListMemberMessagesResponseData> {
    const member = await this.memberContextService.getCurrentActiveMember(authContext);
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const unreadOnly = unreadOnlySchema.parse(query.unreadOnly);

    const where = {
      memberId: member.id,
      ...(unreadOnly ? { readAt: null } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notificationMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.notificationMessage.count({ where }),
    ]);

    return buildPaginatedResult({
      items: rows.map((row) => this.toMemberMessageListItem(row)),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 将当前会员的一条消息标记为已读。
   */
  async markMemberMessageRead(
    authContext: {
      memberId?: string;
      authorization?: string;
    },
    params: MarkMemberMessageReadParams,
  ): Promise<MarkMemberMessageReadResponseData> {
    const member = await this.memberContextService.getCurrentActiveMember(authContext);
    const parsedParams = parseWithSchema(markMemberMessageReadParamsSchema, params);

    const existingMessage = await this.prisma.notificationMessage.findUnique({
      where: { id: parsedParams.messageId },
    });

    if (!existingMessage || existingMessage.memberId !== member.id) {
      throw new BizError({
        code: 'MESSAGE_NOT_FOUND',
        message: 'message not found',
        status: 404,
      });
    }

    const readAt = existingMessage.readAt ?? new Date();
    const updated = await this.prisma.notificationMessage.update({
      where: { id: existingMessage.id },
      data: {
        readAt,
      },
    });

    return {
      id: updated.id,
      isRead: true,
      readAt: toTimestamp(readAt),
    };
  }

  private toMemberMessageListItem(row: {
    id: string;
    messageType: string;
    title: string;
    content: string;
    readAt: Date | null;
    createdAt: Date;
  }): MemberMessageListItem {
    return {
      id: row.id,
      messageType: row.messageType,
      title: row.title,
      content: row.content,
      isRead: row.readAt instanceof Date,
      readAt: toNullableTimestamp(row.readAt),
      createdAt: toTimestamp(row.createdAt),
    };
  }
}
