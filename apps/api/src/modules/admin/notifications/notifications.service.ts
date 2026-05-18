import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationDispatchStatus,
  NotificationMessageType,
  Prisma,
} from '@prisma/client';
import type {
  AdminNotificationOverviewItem,
  GetNotificationsOverviewResponseData,
} from '@contracts/admin/notifications';
import { toNullableTimestamp, toTimestamp } from '../../../common/serializers/timestamp';
import { PrismaService } from '../../../platform/prisma/prisma.service';

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
};

/**
 * 后台通知中心服务。
 * 当前提供基于通知消息与派发记录的总览聚合。
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 读取后台通知中心总览。
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
    const channels = Array.from(
      new Set(allDispatches.map((record) => record.channel)),
    );
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
}
