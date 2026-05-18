import { NotificationChannel, NotificationMessageType } from '@prisma/client';

interface TemplateEntry {
  title: string;
  content: string;
  /// 当 dispatcher 未显式指定渠道时使用。
  defaultChannels: NotificationChannel[];
}

/// 一期阶段通知文案表。
/// TODO(milestone-2)：里程碑二上线通知模板管理器后，本表替换为后台维护。
const TEMPLATES: Record<NotificationMessageType, TemplateEntry> = {
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

export function renderNotification(
  messageType: NotificationMessageType,
  payload: Record<string, string | number> = {},
  channelsOverride?: NotificationChannel[],
): RenderedNotification {
  const tmpl = TEMPLATES[messageType];
  return {
    title: interpolate(tmpl.title, payload),
    content: interpolate(tmpl.content, payload),
    channels: channelsOverride ?? tmpl.defaultChannels,
  };
}
