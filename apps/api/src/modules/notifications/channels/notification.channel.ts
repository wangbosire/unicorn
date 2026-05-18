import type { NotificationChannel, NotificationMessage } from '@prisma/client';

/// 单渠道发送结果；返回字符串供 NotificationDispatchRecord.providerResponse 记录。
export interface ChannelDispatchResult {
  providerResponse?: string;
}

/// 渠道适配器统一接口。失败时直接抛出，Worker 捕获后写 FAILED 记录并交给 BullMQ 重试。
export interface NotificationChannelAdapter {
  readonly channel: NotificationChannel;
  send(message: NotificationMessage): Promise<ChannelDispatchResult>;
}

export const NOTIFICATION_CHANNEL_ADAPTERS = Symbol('NOTIFICATION_CHANNEL_ADAPTERS');
