import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, type NotificationMessage } from '@prisma/client';
import type { ChannelDispatchResult, NotificationChannelAdapter } from './notification.channel';

/// 公众号消息渠道。
/// 当前为骨架实现；真实下游（公众号模板消息 / 客服消息）后续补充。
@Injectable()
export class WechatMpChannel implements NotificationChannelAdapter {
  readonly channel = NotificationChannel.WECHAT_MP;
  private readonly logger = new Logger(WechatMpChannel.name);

  async send(message: NotificationMessage): Promise<ChannelDispatchResult> {
    this.logger.debug(
      `[stub] wechat mp dispatch for message ${message.id} (type=${message.messageType})`,
    );
    return { providerResponse: 'stub:wechat-mp' };
  }
}
