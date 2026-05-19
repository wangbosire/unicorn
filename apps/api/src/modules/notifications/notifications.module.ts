import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { QUEUE_NAMES } from '../../platform/queue/queue.constants';
import { InAppChannel } from './channels/in-app.channel';
import { MiniappSubscriptionChannel } from './channels/miniapp-subscription.channel';
import { WechatMpChannel } from './channels/wechat-mp.channel';
import { NotificationTemplateRenderer } from './content/notification-template';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationProcessor } from './notification.processor';

/// 通知派发模块。
/// 全局可注入 `NotificationDispatcherService`，供激活、审核、转让等业务模块调用。
@Global()
@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NAMES.NOTIFICATIONS })],
  providers: [
    NotificationDispatcherService,
    NotificationProcessor,
    NotificationTemplateRenderer,
    InAppChannel,
    MiniappSubscriptionChannel,
    WechatMpChannel,
  ],
  exports: [NotificationDispatcherService],
})
export class NotificationsModule {}
