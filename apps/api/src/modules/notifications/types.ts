import type { NotificationChannel, NotificationMessageType } from '@prisma/client';

/// 业务模块调用派发器时的输入。
export interface NotificationDispatchInput {
  /// 目标会员 ID。
  memberId: string;
  /// 通知类型，决定文案模板与默认渠道。
  messageType: NotificationMessageType;
  /// 模板变量；模板中以 `{key}` 占位插值。
  payload?: Record<string, string | number>;
  /// 显式指定渠道；不传则使用类型的默认渠道。
  channels?: NotificationChannel[];
}

/// 入队后 worker 收到的单条派发任务。
export interface NotificationDispatchJob {
  messageId: string;
  channel: NotificationChannel;
}

export const NOTIFICATION_DISPATCH_JOB = 'dispatch';
