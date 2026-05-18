import * as assert from 'node:assert/strict';
import {
  NotificationChannel,
  NotificationDispatchStatus,
  NotificationMessageType,
} from '@prisma/client';
import { test } from 'vitest';
import { NotificationsService } from '../../../../src/modules/admin/notifications/notifications.service';

test('NotificationsService.getNotificationsOverview returns grouped notification summary', async () => {
  const messages = [
    {
      id: 'msg_1',
      memberId: 'mem_1',
      messageType: NotificationMessageType.CONTENT_TAKEDOWN,
      title: '内容已下架',
      content: '请返回编辑页处理',
      readAt: null,
      createdAt: new Date('2026-05-18T10:30:00.000Z'),
      dispatchRecords: [
        {
          id: 'dispatch_1',
          messageId: 'msg_1',
          channel: NotificationChannel.IN_APP,
          status: NotificationDispatchStatus.SENT,
          providerResponse: 'delivered',
          sentAt: new Date('2026-05-18T10:30:05.000Z'),
          createdAt: new Date('2026-05-18T10:30:05.000Z'),
        },
        {
          id: 'dispatch_2',
          messageId: 'msg_1',
          channel: NotificationChannel.WECHAT_MP,
          status: NotificationDispatchStatus.FAILED,
          providerResponse: 'openid missing',
          sentAt: null,
          createdAt: new Date('2026-05-18T10:30:10.000Z'),
        },
      ],
    },
    {
      id: 'msg_2',
      memberId: 'mem_2',
      messageType: NotificationMessageType.ACTIVATE_SUCCESS,
      title: '激活成功',
      content: '欢迎查看你的藏品',
      readAt: new Date('2026-05-18T09:20:00.000Z'),
      createdAt: new Date('2026-05-18T09:00:00.000Z'),
      dispatchRecords: [
        {
          id: 'dispatch_3',
          messageId: 'msg_2',
          channel: NotificationChannel.IN_APP,
          status: NotificationDispatchStatus.SENT,
          providerResponse: 'delivered',
          sentAt: new Date('2026-05-18T09:00:10.000Z'),
          createdAt: new Date('2026-05-18T09:00:10.000Z'),
        },
      ],
    },
  ];

  const prisma = {
    notificationMessage: {
      count: async ({ where }: { where?: { readAt?: null } } = {}) => {
        if (where?.readAt === null) {
          return 1;
        }
        return 2;
      },
      findMany: async () => messages,
    },
    notificationDispatchRecord: {
      count: async ({
        where,
      }: {
        where: { status: NotificationDispatchStatus };
      }) =>
        where.status === NotificationDispatchStatus.PENDING ? 0 : 1,
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };

  const service = new NotificationsService(prisma as never);
  const result = await service.getNotificationsOverview();

  assert.equal(result.totalMessages, 2);
  assert.equal(result.unreadMessages, 1);
  assert.equal(result.pendingDispatches, 0);
  assert.equal(result.failedDispatches, 1);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0]?.messageType, NotificationMessageType.CONTENT_TAKEDOWN);
  assert.equal(result.items[0]?.eventLabel, '内容被人工下架');
  assert.deepEqual(result.items[0]?.channels, ['IN_APP', 'WECHAT_MP']);
  assert.equal(result.items[0]?.latestDispatchStatus, NotificationDispatchStatus.FAILED);
  assert.equal(result.items[0]?.failedDispatches, 1);
  assert.ok(Number.isFinite(result.generatedAt));
});
