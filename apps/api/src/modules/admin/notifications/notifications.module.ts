import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../platform/queue/queue.constants';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * 后台通知中心模块。
 */
@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NAMES.NOTIFICATIONS })],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
