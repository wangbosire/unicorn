import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationMessageType,
  NotificationTemplateStatus,
} from '@prisma/client';
import { PrismaService } from '../../../platform/prisma/prisma.service';

interface TemplateEntry {
  title: string;
  content: string;
  /// 当 dispatcher 未显式指定渠道时使用。
  defaultChannels: NotificationChannel[];
}

/// 回退文案表。
/// 当数据库模板尚未初始化或被误删时，仍保证通知链路可继续运行。
const FALLBACK_TEMPLATES: Record<NotificationMessageType, TemplateEntry> = {
  ACTIVATE_SUCCESS: {
    title: '激活成功',
    content: '你的藏品「{collectionName}」已激活，进入「我的藏品」查看。',
    defaultChannels: [NotificationChannel.IN_APP],
  },
  CONTENT_APPROVED: {
    title: '内容审核通过',
    content: '藏品「{collectionName}」的内容审核已通过，已对外展示。',
    defaultChannels: [NotificationChannel.IN_APP],
  },
  CONTENT_REJECTED: {
    title: '内容审核驳回',
    content: '藏品「{collectionName}」的内容审核未通过：{reason}。请修改后重新提交。',
    defaultChannels: [NotificationChannel.IN_APP],
  },
  CONTENT_TAKEDOWN: {
    title: '内容已下架',
    content: '藏品「{collectionName}」的展示内容已被下架：{reason}。',
    defaultChannels: [NotificationChannel.IN_APP],
  },
  COMMENT_REVIEW_RESULT: {
    title: '评论审核结果',
    content: '你的评论「{excerpt}」审核{result}。',
    defaultChannels: [NotificationChannel.IN_APP],
  },
  TRANSFER_PENDING_ACCEPT: {
    title: '收到一笔转让',
    content: '会员 {fromMemberNo} 向你转让藏品「{collectionName}」，待你确认。',
    defaultChannels: [NotificationChannel.IN_APP],
  },
  TRANSFER_COMPLETED: {
    title: '转让已完成',
    content: '藏品「{collectionName}」的转让已完成。',
    defaultChannels: [NotificationChannel.IN_APP],
  },
  TRANSFER_CANCELLED: {
    title: '转让已撤销',
    content: '发起方已撤销藏品「{collectionName}」的转让。',
    defaultChannels: [NotificationChannel.IN_APP],
  },
  TRANSFER_EXPIRED: {
    title: '转让已过期',
    content: '藏品「{collectionName}」的转让因超时未确认而过期。',
    defaultChannels: [NotificationChannel.IN_APP],
  },
  TRANSFER_ROLLED_BACK: {
    title: '转让已回滚',
    content: '藏品「{collectionName}」的已完成转让已被后台回滚，请以当前持有结果为准。',
    defaultChannels: [NotificationChannel.IN_APP],
  },
};

const PLACEHOLDER = /\{(\w+)\}/g;

function interpolate(template: string, payload: Record<string, string | number>): string {
  return template.replace(PLACEHOLDER, (_, key: string) => {
    const value = payload[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

export interface RenderedNotification {
  title: string;
  content: string;
  channels: NotificationChannel[];
}

/**
 * 通知模板渲染服务。
 * 运行时优先读取后台生效模板；缺失时回退到内置默认文案。
 */
@Injectable()
export class NotificationTemplateRenderer {
  constructor(private readonly prisma: PrismaService) {}

  async render(
    messageType: NotificationMessageType,
    payload: Record<string, string | number> = {},
    channelsOverride?: NotificationChannel[],
  ): Promise<RenderedNotification> {
    const fromDb = await this.prisma.notificationTemplate.findUnique({
      where: { templateKey: messageType },
      include: {
        currentVersion: {
          include: {
            channels: {
              orderBy: { channel: 'asc' },
            },
          },
        },
      },
    });

    const activeChannels =
      fromDb?.status === NotificationTemplateStatus.ACTIVE
        ? fromDb.currentVersion?.channels ?? []
        : [];

    if (activeChannels.length > 0) {
      const primaryChannel = activeChannels[0]!;
      return {
        title: interpolate(primaryChannel.title, payload),
        content: interpolate(primaryChannel.content, payload),
        channels: channelsOverride ?? activeChannels.map((item) => item.channel),
      };
    }

    const fallback = FALLBACK_TEMPLATES[messageType];
    return {
      title: interpolate(fallback.title, payload),
      content: interpolate(fallback.content, payload),
      channels: channelsOverride ?? fallback.defaultChannels,
    };
  }
}
