import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, type NotificationMessage } from '@prisma/client';
import type { ChannelDispatchResult, NotificationChannelAdapter } from './notification.channel';

/// 小程序订阅消息渠道。
/// 当前为骨架实现；真实下游（wx.requestSubscribeMessage + 发送 API）后续补充。
@Injectable()
export class MiniappSubscriptionChannel implements NotificationChannelAdapter {
  readonly channel = NotificationChannel.MINIAPP_SUBSCRIPTION;
  private readonly logger = new Logger(MiniappSubscriptionChannel.name);

  async send(message: NotificationMessage): Promise<ChannelDispatchResult> {
    this.logger.debug(
      `[stub] miniapp subscription dispatch for message ${message.id} (type=${message.messageType})`,
    );
    return { providerResponse: 'stub:miniapp-subscription' };
  }
}
