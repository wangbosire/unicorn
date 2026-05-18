import { Injectable } from '@nestjs/common';
import { NotificationChannel, type NotificationMessage } from '@prisma/client';
import type { ChannelDispatchResult, NotificationChannelAdapter } from './notification.channel';

/// 站内信渠道。
/// 站内信的"投递"语义即 `NotificationMessage` 行本身存在；
/// 这里仅写一条 SENT 记录用于派发可观测一致性。
@Injectable()
export class InAppChannel implements NotificationChannelAdapter {
  readonly channel = NotificationChannel.IN_APP;

  async send(_message: NotificationMessage): Promise<ChannelDispatchResult> {
    return { providerResponse: 'in-app delivered via NotificationMessage row' };
  }
}
