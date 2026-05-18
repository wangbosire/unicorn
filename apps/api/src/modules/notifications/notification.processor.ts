import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { NotificationChannel, NotificationDispatchStatus } from '@prisma/client';
import type { Job } from 'bullmq';
import { PrismaService } from '../../platform/prisma/prisma.service';
import { QUEUE_NAMES } from '../../platform/queue/queue.constants';
import { InAppChannel } from './channels/in-app.channel';
import { MiniappSubscriptionChannel } from './channels/miniapp-subscription.channel';
import type { NotificationChannelAdapter } from './channels/notification.channel';
import { WechatMpChannel } from './channels/wechat-mp.channel';
import type { NotificationDispatchJob } from './types';

/// BullMQ Worker。每个 job 处理一个 (messageId, channel) 派发。
/// 失败抛错给 BullMQ 自动按指数退避重试；最终失败由 removeOnFail 保留追溯。
@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  private readonly adapters: Record<NotificationChannel, NotificationChannelAdapter>;

  constructor(
    private readonly prisma: PrismaService,
    inApp: InAppChannel,
    miniapp: MiniappSubscriptionChannel,
    wechatMp: WechatMpChannel,
  ) {
    super();
    this.adapters = {
      [NotificationChannel.IN_APP]: inApp,
      [NotificationChannel.MINIAPP_SUBSCRIPTION]: miniapp,
      [NotificationChannel.WECHAT_MP]: wechatMp,
    };
  }

  async process(job: Job<NotificationDispatchJob>): Promise<void> {
    const { messageId, channel } = job.data;
    const message = await this.prisma.notificationMessage.findUnique({ where: { id: messageId } });
    if (!message) {
      this.logger.warn(`message ${messageId} not found, skipping channel=${channel}`);
      return;
    }

    const adapter = this.adapters[channel];
    try {
      const result = await adapter.send(message);
      await this.prisma.notificationDispatchRecord.create({
        data: {
          messageId,
          channel,
          status: NotificationDispatchStatus.SENT,
          sentAt: new Date(),
          providerResponse: result.providerResponse,
        },
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      await this.prisma.notificationDispatchRecord.create({
        data: {
          messageId,
          channel,
          status: NotificationDispatchStatus.FAILED,
          providerResponse: reason,
        },
      });
      throw err;
    }
  }
}
