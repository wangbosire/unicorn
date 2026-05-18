import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { NotificationMessage } from '@prisma/client';
import type { Queue } from 'bullmq';
import { PrismaService } from '../../platform/prisma/prisma.service';
import { QUEUE_NAMES } from '../../platform/queue/queue.constants';
import { renderNotification } from './content/notification-template';
import {
  NOTIFICATION_DISPATCH_JOB,
  type NotificationDispatchInput,
  type NotificationDispatchJob,
} from './types';

/// 通知派发的统一入口。业务模块只通过本服务发起通知，不直接写表或入队。
///
/// 流程：
/// 1. 同步写 NotificationMessage（站内信即时可读）；
/// 2. 按目标渠道，每个渠道入队一条派发任务，Worker 异步执行下游 + 写派发记录。
@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly queue: Queue<NotificationDispatchJob>,
  ) {}

  async dispatch(input: NotificationDispatchInput): Promise<NotificationMessage> {
    const { memberId, messageType, payload = {}, channels: channelsOverride } = input;
    const { title, content, channels } = renderNotification(messageType, payload, channelsOverride);

    const message = await this.prisma.notificationMessage.create({
      data: { memberId, messageType, title, content },
    });

    await Promise.all(
      channels.map((channel) =>
        this.queue.add(
          NOTIFICATION_DISPATCH_JOB,
          { messageId: message.id, channel },
          {
            attempts: 5,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
            removeOnFail: { age: 7 * 24 * 60 * 60 },
          },
        ),
      ),
    );

    this.logger.debug(
      `dispatched message ${message.id} (type=${messageType}, channels=${channels.join(',')})`,
    );
    return message;
  }
}
