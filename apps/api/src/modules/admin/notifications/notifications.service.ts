import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationDispatchStatus,
  NotificationMessageType,
  NotificationTemplateStatus,
  Prisma,
} from '@prisma/client';
import type {
  GetNotificationDispatchRecordResponseData,
  GetNotificationDispatchHistoryResponseData,
  AdminNotificationFailureSummaryItem,
  AdminNotificationOverviewItem,
  AdminNotificationDispatchRecordListItem,
  AdminNotificationTemplateChannel,
  CreateNotificationTemplateResponseData,
  GetNotificationTemplateResponseData,
  ListNotificationFailureSummaryQuery,
  ListNotificationFailureSummaryResponseData,
  ListNotificationDispatchRecordsQuery,
  ListNotificationDispatchRecordsResponseData,
  ListNotificationTemplatesQuery,
  ListNotificationTemplatesResponseData,
  GetNotificationsOverviewResponseData,
  RetryNotificationDispatchResponseData,
  UpdateNotificationTemplateStatusRequest,
  UpdateNotificationTemplateStatusResponseData,
  UpdateNotificationTemplateResponseData,
  UpsertNotificationTemplateRequest,
} from '@contracts/admin/notifications';
import type { Queue } from 'bullmq';
import { BizError } from '../../../common/http/biz-error';
import {
  buildPaginatedResult,
  parsePaginationQuery,
} from '../../../common/pagination/pagination';
import { toNullableTimestamp, toTimestamp } from '../../../common/serializers/timestamp';
import { parseOptionalEnumValue } from '../../../common/validation/enum';
import {
  requiredIdField,
  requiredTextField,
} from '../../../common/validation/fields';
import { parseWithSchema } from '../../../common/validation/schema';
import { PrismaService } from '../../../platform/prisma/prisma.service';
import { QUEUE_NAMES } from '../../../platform/queue/queue.constants';
import { z } from 'zod';
import {
  NOTIFICATION_DISPATCH_JOB,
  type NotificationDispatchJob,
} from '../../notifications/types';
import {
  NOTIFICATION_FAILURE_CODES,
  normalizeNotificationFailure,
  type NotificationFailureCode,
} from './notification-failure-normalizer';

const MESSAGE_TYPE_LABELS: Record<NotificationMessageType, string> = {
  ACTIVATE_SUCCESS: '激活成功',
  CONTENT_APPROVED: '内容审核通过',
  CONTENT_REJECTED: '内容审核驳回',
  CONTENT_TAKEDOWN: '内容被人工下架',
  COMMENT_REVIEW_RESULT: '评论审核结果',
  TRANSFER_PENDING_ACCEPT: '转让待接收',
  TRANSFER_COMPLETED: '转让完成',
  TRANSFER_CANCELLED: '转让已撤销',
  TRANSFER_EXPIRED: '转让已过期',
  TRANSFER_ROLLED_BACK: '转让已回滚',
};

const notificationTemplateChannelSchema = z.object({
  channel: z.enum([
    NotificationChannel.IN_APP,
    NotificationChannel.MINIAPP_SUBSCRIPTION,
    NotificationChannel.WECHAT_MP,
  ]),
  title: requiredTextField('channel title'),
  content: requiredTextField('channel content'),
});

const upsertNotificationTemplateSchema = z.object({
  templateKey: z.enum([
    NotificationMessageType.ACTIVATE_SUCCESS,
    NotificationMessageType.CONTENT_APPROVED,
    NotificationMessageType.CONTENT_REJECTED,
    NotificationMessageType.CONTENT_TAKEDOWN,
    NotificationMessageType.COMMENT_REVIEW_RESULT,
    NotificationMessageType.TRANSFER_PENDING_ACCEPT,
    NotificationMessageType.TRANSFER_COMPLETED,
    NotificationMessageType.TRANSFER_CANCELLED,
    NotificationMessageType.TRANSFER_EXPIRED,
    NotificationMessageType.TRANSFER_ROLLED_BACK,
  ]),
  displayName: requiredTextField('display name'),
  description: z.string().trim().nullable().optional(),
  changeNote: z.string().trim().nullable().optional(),
  channels: z
    .array(notificationTemplateChannelSchema)
    .min(1, 'template channels are required')
    .superRefine((items, ctx) => {
      const seen = new Set<string>();
      for (const item of items) {
        if (seen.has(item.channel)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `duplicate channel: ${item.channel}`,
          });
          return;
        }
        seen.add(item.channel);
      }
    }),
});

const updateNotificationTemplateStatusSchema = z.object({
  status: z.enum([NotificationTemplateStatus.ACTIVE, NotificationTemplateStatus.DISABLED]),
});

/**
 * 后台通知中心服务。
 * 当前提供通知总览与模板治理能力。
 */
@Injectable()
export class NotificationsService {
  // 读写都走本服务，异常由 ApiExceptionFilter 统一记日志。
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue<NotificationDispatchJob>,
  ) {}

  /**
   * 读取通知中心总览。
   * 聚合每类通知的最近消息、渠道覆盖与发送状态概览。
   */
  async getNotificationsOverview(): Promise<GetNotificationsOverviewResponseData> {
    const generatedAt = new Date();

    const [totalMessages, unreadMessages, pendingDispatches, failedDispatches, messages] =
      await this.prisma.$transaction([
        this.prisma.notificationMessage.count(),
        this.prisma.notificationMessage.count({
          where: { readAt: null },
        }),
        this.prisma.notificationDispatchRecord.count({
          where: { status: NotificationDispatchStatus.PENDING },
        }),
        this.prisma.notificationDispatchRecord.count({
          where: { status: NotificationDispatchStatus.FAILED },
        }),
        this.prisma.notificationMessage.findMany({
          include: {
            dispatchRecords: {
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    const grouped = new Map<NotificationMessageType, typeof messages>();
    for (const message of messages) {
      const current = grouped.get(message.messageType) ?? [];
      current.push(message);
      grouped.set(message.messageType, current);
    }

    const items = Array.from(grouped.entries())
      .map(([messageType, group]) => this.toOverviewItem(messageType, group))
      .sort((a, b) => b.latestCreatedAt - a.latestCreatedAt);

    return {
      totalMessages,
      unreadMessages,
      pendingDispatches,
      failedDispatches,
      items,
      generatedAt: toTimestamp(generatedAt),
    };
  }

  /**
   * 分页查询通知派发记录。
   */
  async listNotificationDispatchRecords(
    query: ListNotificationDispatchRecordsQuery,
  ): Promise<ListNotificationDispatchRecordsResponseData> {
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const messageType = this.parseMessageType(query.messageType);
    const status = this.parseDispatchStatus(query.status);
    const channel = this.parseChannel(query.channel);
    const failureCodeFilter = this.parseFailureCode(query.failureCode);

    if (
      failureCodeFilter &&
      status &&
      status !== NotificationDispatchStatus.FAILED
    ) {
      return buildPaginatedResult({
        items: [],
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: 0,
      });
    }

    const where: Prisma.NotificationDispatchRecordWhereInput = {
      ...(failureCodeFilter
        ? { status: NotificationDispatchStatus.FAILED }
        : status
          ? { status }
          : {}),
      ...(channel ? { channel } : {}),
      ...(messageType ? { message: { messageType } } : {}),
    };

    if (failureCodeFilter) {
      const rows = await this.prisma.notificationDispatchRecord.findMany({
        where,
        include: {
          message: {
            select: {
              id: true,
              memberId: true,
              messageType: true,
              title: true,
              content: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      const filteredItems = rows
        .map((row) => this.toDispatchRecordListItem(row))
        .filter((row) => row.failureCode === failureCodeFilter);

      return buildPaginatedResult({
        items: filteredItems.slice(pagination.skip, pagination.skip + pagination.take),
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: filteredItems.length,
      });
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notificationDispatchRecord.findMany({
        where,
        include: {
          message: {
            select: {
              id: true,
              memberId: true,
              messageType: true,
              title: true,
              content: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.notificationDispatchRecord.count({ where }),
    ]);

    return buildPaginatedResult({
      items: rows.map((row) => this.toDispatchRecordListItem(row)),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 读取通知失败聚合视图。
   * 按事件模板、渠道与失败原因聚合，方便运营快速定位共性故障。
   */
  async listNotificationFailureSummary(
    query: ListNotificationFailureSummaryQuery,
  ): Promise<ListNotificationFailureSummaryResponseData> {
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const messageType = this.parseMessageType(query.messageType);
    const channel = this.parseChannel(query.channel);
    const failureCodeFilter = this.parseFailureCode(query.failureCode);

    const rows = await this.prisma.notificationDispatchRecord.findMany({
      where: {
        status: NotificationDispatchStatus.FAILED,
        ...(channel ? { channel } : {}),
        ...(messageType ? { message: { messageType } } : {}),
      },
      select: {
        id: true,
        messageId: true,
        channel: true,
        providerResponse: true,
        createdAt: true,
        message: {
          select: {
            messageType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const grouped = new Map<
      string,
      {
        messageType: NotificationMessageType;
        channel: NotificationChannel;
        failureCode: NotificationFailureCode;
        failureReason: string;
        sampleReason: string | null;
        failedCount: number;
        affectedMessageIds: Set<string>;
        latestFailedAt: number;
        latestDispatchRecordId: string;
      }
    >();

    for (const row of rows) {
      const sampleReason = row.providerResponse?.trim() || null;
      const normalizedFailure = normalizeNotificationFailure(sampleReason);
      const failureCode = normalizedFailure.code;
      const failureReason = normalizedFailure.label;

      if (failureCodeFilter && failureCode !== failureCodeFilter) {
        continue;
      }

      const key = `${row.message.messageType}::${row.channel}::${failureCode}`;
      const current = grouped.get(key);
      const createdAt = row.createdAt.getTime();

      if (!current) {
        grouped.set(key, {
          messageType: row.message.messageType,
          channel: row.channel,
          failureCode,
          failureReason,
          sampleReason,
          failedCount: 1,
          affectedMessageIds: new Set([row.messageId]),
          latestFailedAt: createdAt,
          latestDispatchRecordId: row.id,
        });
        continue;
      }

      current.failedCount += 1;
      current.affectedMessageIds.add(row.messageId);
    }

    const items = Array.from(grouped.values())
      .map<AdminNotificationFailureSummaryItem>((item) => ({
        messageType: item.messageType,
        eventLabel: MESSAGE_TYPE_LABELS[item.messageType],
        channel: item.channel,
        failureCode: item.failureCode,
        failureReason: item.failureReason,
        sampleReason: item.sampleReason,
        failedCount: item.failedCount,
        affectedMessages: item.affectedMessageIds.size,
        latestFailedAt: item.latestFailedAt,
        latestDispatchRecordId: item.latestDispatchRecordId,
      }))
      .sort((a, b) => {
        if (b.latestFailedAt !== a.latestFailedAt) {
          return b.latestFailedAt - a.latestFailedAt;
        }
        return b.failedCount - a.failedCount;
      });

    return buildPaginatedResult({
      items: items.slice(pagination.skip, pagination.skip + pagination.take),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: items.length,
    });
  }

  /**
   * 查询单条派发记录详情。
   */
  async getNotificationDispatchRecord(
    dispatchRecordId: string,
  ): Promise<GetNotificationDispatchRecordResponseData> {
    const id = this.requireDispatchRecordId(dispatchRecordId);
    const row = await this.prisma.notificationDispatchRecord.findUnique({
      where: { id },
      include: {
        message: {
          select: {
            id: true,
            memberId: true,
            messageType: true,
            title: true,
            content: true,
          },
        },
      },
    });

    if (!row) {
      throw new BizError({
        code: 'NOTIFICATION_DISPATCH_RECORD_NOT_FOUND',
        message: 'notification dispatch record not found',
        status: 404,
      });
    }

    return this.toDispatchRecordListItem(row);
  }

  /**
   * 查询单条派发记录对应的全部尝试历史。
   * 以 messageId + channel 聚合同一条通知在同一渠道上的重试轨迹。
   */
  async getNotificationDispatchHistory(
    dispatchRecordId: string,
  ): Promise<GetNotificationDispatchHistoryResponseData> {
    const id = this.requireDispatchRecordId(dispatchRecordId);
    const anchor = await this.prisma.notificationDispatchRecord.findUnique({
      where: { id },
      select: {
        id: true,
        messageId: true,
        channel: true,
      },
    });

    if (!anchor) {
      throw new BizError({
        code: 'NOTIFICATION_DISPATCH_RECORD_NOT_FOUND',
        message: 'notification dispatch record not found',
        status: 404,
      });
    }

    const rows = await this.prisma.notificationDispatchRecord.findMany({
      where: {
        messageId: anchor.messageId,
        channel: anchor.channel,
      },
      select: {
        id: true,
        status: true,
        providerResponse: true,
        sentAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      dispatchRecordId: anchor.id,
      messageId: anchor.messageId,
      channel: anchor.channel,
      totalAttempts: rows.length,
      attempts: rows.map((row, index) => ({
        dispatchRecordId: row.id,
        attemptNo: index + 1,
        status: row.status,
        failureCode:
          row.status === NotificationDispatchStatus.FAILED
            ? normalizeNotificationFailure(row.providerResponse).code
            : null,
        failureReason:
          row.status === NotificationDispatchStatus.FAILED
            ? normalizeNotificationFailure(row.providerResponse).label
            : null,
        providerResponse: row.providerResponse,
        sentAt: toNullableTimestamp(row.sentAt),
        createdAt: toTimestamp(row.createdAt),
      })),
    };
  }

  /**
   * 将一条失败派发重新入队。
   */
  async retryNotificationDispatch(
    dispatchRecordId: string,
  ): Promise<RetryNotificationDispatchResponseData> {
    const id = this.requireDispatchRecordId(dispatchRecordId);
    const record = await this.prisma.notificationDispatchRecord.findUnique({
      where: { id },
      select: {
        id: true,
        messageId: true,
        channel: true,
        status: true,
      },
    });

    if (!record) {
      throw new BizError({
        code: 'NOTIFICATION_DISPATCH_RECORD_NOT_FOUND',
        message: 'notification dispatch record not found',
        status: 404,
      });
    }

    if (record.status !== NotificationDispatchStatus.FAILED) {
      throw new BizError({
        code: 'NOTIFICATION_DISPATCH_RETRY_NOT_ALLOWED',
        message: 'only failed dispatch records can be retried',
        status: 409,
      });
    }

    await this.notificationsQueue.add(
      NOTIFICATION_DISPATCH_JOB,
      {
        messageId: record.messageId,
        channel: record.channel,
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
        removeOnFail: { age: 7 * 24 * 60 * 60 },
      },
    );

    this.logger.log('notification dispatch retried', {
      event: 'admin.notification_dispatch.retried',
      dispatchRecordId: record.id,
      messageId: record.messageId,
      channel: record.channel,
    });

    return {
      dispatchRecordId: record.id,
      messageId: record.messageId,
      channel: record.channel,
      jobName: NOTIFICATION_DISPATCH_JOB,
    };
  }

  /**
   * 分页查询通知模板列表。
   */
  async listNotificationTemplates(
    query: ListNotificationTemplatesQuery,
  ): Promise<ListNotificationTemplatesResponseData> {
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const status = this.parseTemplateStatus(query.status);

    const where: Prisma.NotificationTemplateWhereInput = {
      ...(status ? { status } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notificationTemplate.findMany({
        where,
        include: {
          currentVersion: {
            include: {
              channels: {
                orderBy: { channel: 'asc' },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.notificationTemplate.count({ where }),
    ]);

    return buildPaginatedResult({
      items: rows.map((row) => ({
        templateId: row.id,
        templateKey: row.templateKey,
        displayName: row.displayName,
        description: row.description,
        status: row.status,
        currentVersion: row.currentVersion?.version ?? null,
        channels: row.currentVersion?.channels.map((item) => item.channel) ?? [],
        updatedAt: toTimestamp(row.updatedAt),
      })),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 查询单个通知模板详情。
   */
  async getNotificationTemplate(templateId: string): Promise<GetNotificationTemplateResponseData> {
    const id = this.requireTemplateId(templateId);
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
      include: {
        currentVersion: {
          include: {
            channels: {
              orderBy: { channel: 'asc' },
            },
          },
        },
        versions: {
          include: {
            channels: {
              orderBy: { channel: 'asc' },
            },
          },
          orderBy: { version: 'desc' },
        },
      },
    });

    if (!template) {
      throw new BizError({
        code: 'NOTIFICATION_TEMPLATE_NOT_FOUND',
        message: 'notification template not found',
        status: 404,
      });
    }

    return {
      templateId: template.id,
      templateKey: template.templateKey,
      displayName: template.displayName,
      description: template.description,
      status: template.status,
      currentVersionId: template.currentVersion?.id ?? null,
      currentVersion: template.currentVersion?.version ?? null,
      channels: this.toTemplateChannels(template.currentVersion?.channels ?? []),
      versions: template.versions.map((version) => ({
        versionId: version.id,
        version: version.version,
        changeNote: version.changeNote,
        channels: this.toTemplateChannels(version.channels),
        createdAt: toTimestamp(version.createdAt),
      })),
      createdAt: toTimestamp(template.createdAt),
      updatedAt: toTimestamp(template.updatedAt),
    };
  }

  /**
   * 创建通知模板并发布首个版本。
   */
  async createNotificationTemplate(
    payload: UpsertNotificationTemplateRequest,
  ): Promise<CreateNotificationTemplateResponseData> {
    const parsed = parseWithSchema(upsertNotificationTemplateSchema, payload);
    const existing = await this.prisma.notificationTemplate.findUnique({
      where: { templateKey: parsed.templateKey },
      select: { id: true },
    });

    if (existing) {
      throw new BizError({
        code: 'NOTIFICATION_TEMPLATE_ALREADY_EXISTS',
        message: 'notification template already exists',
        status: 409,
      });
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const template = await tx.notificationTemplate.create({
        data: {
          templateKey: parsed.templateKey,
          displayName: parsed.displayName,
          description: parsed.description ?? null,
          status: NotificationTemplateStatus.ACTIVE,
        },
        select: { id: true },
      });

      const version = await tx.notificationTemplateVersion.create({
        data: {
          templateId: template.id,
          version: 1,
          changeNote: parsed.changeNote ?? null,
          channels: {
            create: parsed.channels.map((channel) => ({
              channel: channel.channel,
              title: channel.title,
              content: channel.content,
            })),
          },
        },
        select: {
          id: true,
          version: true,
        },
      });

      const updated = await tx.notificationTemplate.update({
        where: { id: template.id },
        data: {
          currentVersionId: version.id,
        },
        select: {
          id: true,
          templateKey: true,
          updatedAt: true,
        },
      });

      return {
        templateId: updated.id,
        templateKey: updated.templateKey,
        currentVersion: version.version,
        updatedAt: toTimestamp(updated.updatedAt),
      };
    });

    this.logger.log('notification template created', {
      event: 'admin.notification_template.created',
      templateId: created.templateId,
      templateKey: created.templateKey,
      version: created.currentVersion,
    });

    return created;
  }

  /**
   * 更新通知模板并生成新版本。
   */
  async updateNotificationTemplate(
    templateId: string,
    payload: UpsertNotificationTemplateRequest,
  ): Promise<UpdateNotificationTemplateResponseData> {
    const id = this.requireTemplateId(templateId);
    const parsed = parseWithSchema(upsertNotificationTemplateSchema, payload);
    const existing = await this.prisma.notificationTemplate.findUnique({
      where: { id },
      include: {
        currentVersion: {
          select: { version: true },
        },
      },
    });

    if (!existing) {
      throw new BizError({
        code: 'NOTIFICATION_TEMPLATE_NOT_FOUND',
        message: 'notification template not found',
        status: 404,
      });
    }

    if (existing.templateKey !== parsed.templateKey) {
      throw new BizError({
        code: 'NOTIFICATION_TEMPLATE_KEY_IMMUTABLE',
        message: 'notification template key cannot be changed',
        status: 409,
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const version = await tx.notificationTemplateVersion.create({
        data: {
          templateId: existing.id,
          version: (existing.currentVersion?.version ?? 0) + 1,
          changeNote: parsed.changeNote ?? null,
          channels: {
            create: parsed.channels.map((channel) => ({
              channel: channel.channel,
              title: channel.title,
              content: channel.content,
            })),
          },
        },
        select: {
          id: true,
          version: true,
        },
      });

      const template = await tx.notificationTemplate.update({
        where: { id: existing.id },
        data: {
          displayName: parsed.displayName,
          description: parsed.description ?? null,
          currentVersionId: version.id,
        },
        select: {
          id: true,
          updatedAt: true,
        },
      });

      return {
        templateId: template.id,
        currentVersion: version.version,
        updatedAt: toTimestamp(template.updatedAt),
      };
    });

    this.logger.log('notification template updated', {
      event: 'admin.notification_template.updated',
      templateId: updated.templateId,
      version: updated.currentVersion,
    });

    return updated;
  }

  /**
   * 更新通知模板启停状态。
   */
  async updateNotificationTemplateStatus(
    templateId: string,
    payload: UpdateNotificationTemplateStatusRequest,
  ): Promise<UpdateNotificationTemplateStatusResponseData> {
    const id = this.requireTemplateId(templateId);
    const parsed = parseWithSchema(updateNotificationTemplateStatusSchema, payload);

    const existing = await this.prisma.notificationTemplate.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new BizError({
        code: 'NOTIFICATION_TEMPLATE_NOT_FOUND',
        message: 'notification template not found',
        status: 404,
      });
    }

    const updated = await this.prisma.notificationTemplate.update({
      where: { id },
      data: { status: parsed.status },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    this.logger.log('notification template status changed', {
      event: 'admin.notification_template.status.changed',
      templateId: updated.id,
      status: updated.status,
    });

    return {
      templateId: updated.id,
      status: updated.status,
      updatedAt: toTimestamp(updated.updatedAt),
    };
  }

  private toOverviewItem(
    messageType: NotificationMessageType,
    group: Prisma.NotificationMessageGetPayload<{
      include: { dispatchRecords: true };
    }>[],
  ): AdminNotificationOverviewItem {
    const latestMessage = group[0]!;
    const allDispatches = group.flatMap((message) => message.dispatchRecords);
    const latestDispatch =
      allDispatches
        .slice()
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
    const channels = Array.from(new Set(allDispatches.map((record) => record.channel)));
    const lastSentAt = allDispatches
      .map((record) => record.sentAt)
      .filter((value): value is Date => value instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    return {
      messageType,
      eventLabel: MESSAGE_TYPE_LABELS[messageType],
      latestTitle: latestMessage.title,
      latestContent: latestMessage.content,
      channels,
      latestDispatchStatus: latestDispatch?.status ?? null,
      latestDispatchNote: latestDispatch?.providerResponse ?? null,
      totalMessages: group.length,
      pendingDispatches: allDispatches.filter(
        (record) => record.status === NotificationDispatchStatus.PENDING,
      ).length,
      failedDispatches: allDispatches.filter(
        (record) => record.status === NotificationDispatchStatus.FAILED,
      ).length,
      lastSentAt: toNullableTimestamp(lastSentAt),
      latestCreatedAt: toTimestamp(latestMessage.createdAt),
    };
  }

  private parseMessageType(
    value: string | undefined,
  ): NotificationMessageType | undefined {
    return parseOptionalEnumValue(
      value,
      Object.values(NotificationMessageType),
      'INVALID_NOTIFICATION_MESSAGE_TYPE',
      'notification message type is invalid',
    );
  }

  private parseDispatchStatus(
    value: string | undefined,
  ): NotificationDispatchStatus | undefined {
    return parseOptionalEnumValue(
      value,
      Object.values(NotificationDispatchStatus),
      'INVALID_NOTIFICATION_DISPATCH_STATUS',
      'notification dispatch status is invalid',
    );
  }

  private parseChannel(
    value: string | undefined,
  ): NotificationChannel | undefined {
    return parseOptionalEnumValue(
      value,
      Object.values(NotificationChannel),
      'INVALID_NOTIFICATION_CHANNEL',
      'notification channel is invalid',
    );
  }

  private parseFailureCode(
    value: string | undefined,
  ): NotificationFailureCode | undefined {
    return parseOptionalEnumValue(
      value,
      NOTIFICATION_FAILURE_CODES,
      'INVALID_NOTIFICATION_FAILURE_CODE',
      'notification failure code is invalid',
    );
  }

  private parseTemplateStatus(
    value: string | undefined,
  ): NotificationTemplateStatus | undefined {
    return parseOptionalEnumValue(
      value,
      [NotificationTemplateStatus.ACTIVE, NotificationTemplateStatus.DISABLED],
      'INVALID_NOTIFICATION_TEMPLATE_STATUS',
      'notification template status is invalid',
    );
  }

  private requireTemplateId(value: string): string {
    return parseWithSchema(requiredIdField('notification template'), value);
  }

  private requireDispatchRecordId(value: string): string {
    return parseWithSchema(requiredIdField('notification dispatch record'), value);
  }

  private toDispatchRecordListItem(
    row: Prisma.NotificationDispatchRecordGetPayload<{
      include: {
        message: {
          select: {
            id: true;
            memberId: true;
            messageType: true;
            title: true;
            content: true;
          };
        };
      };
    }>,
  ): AdminNotificationDispatchRecordListItem {
    const normalizedFailure =
      row.status === NotificationDispatchStatus.FAILED
        ? normalizeNotificationFailure(row.providerResponse)
        : null;

    return {
      dispatchRecordId: row.id,
      messageId: row.message.id,
      messageType: row.message.messageType,
      eventLabel: MESSAGE_TYPE_LABELS[row.message.messageType],
      memberId: row.message.memberId,
      title: row.message.title,
      content: row.message.content,
      channel: row.channel,
      status: row.status,
      failureCode: normalizedFailure?.code ?? null,
      failureReason: normalizedFailure?.label ?? null,
      providerResponse: row.providerResponse,
      sentAt: toNullableTimestamp(row.sentAt),
      createdAt: toTimestamp(row.createdAt),
    };
  }

  private toTemplateChannels(
    channels: Array<{
      channel: NotificationChannel;
      title: string;
      content: string;
    }>,
  ): AdminNotificationTemplateChannel[] {
    return channels.map((item) => ({
      channel: item.channel,
      title: item.title,
      content: item.content,
    }));
  }
}
