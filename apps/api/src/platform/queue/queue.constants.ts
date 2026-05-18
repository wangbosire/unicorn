/// BullMQ 队列名集中常量。新增队列时同步在此注册，避免拼写漂移。
export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
