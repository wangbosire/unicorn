import * as assert from 'node:assert/strict';
import {
  NotificationChannel,
  NotificationDispatchStatus,
  NotificationMessageType,
  NotificationTemplateStatus,
} from '@prisma/client';
import { test } from 'vitest';
import { BizError } from '../../../../src/common/http/biz-error';
import { NotificationsService } from '../../../../src/modules/admin/notifications/notifications.service';

const noopQueue = {
  add: async () => ({}),
};

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

  const service = new NotificationsService(prisma as never, noopQueue as never);
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

test('NotificationsService.listNotificationDispatchRecords returns paginated records', async () => {
  const prisma = {
    notificationDispatchRecord: {
      findMany: async () => [
        {
          id: 'dispatch_1',
          channel: NotificationChannel.WECHAT_MP,
          status: NotificationDispatchStatus.FAILED,
          providerResponse: 'openid missing',
          sentAt: null,
          createdAt: new Date('2026-05-19T10:00:00.000Z'),
          message: {
            id: 'msg_1',
            memberId: 'mem_1',
            messageType: NotificationMessageType.CONTENT_TAKEDOWN,
            title: '内容已下架',
            content: '请返回编辑页处理',
          },
        },
      ],
      count: async () => 1,
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };

  const service = new NotificationsService(prisma as never, {} as never);
  const result = await service.listNotificationDispatchRecords({
    page: '1',
    pageSize: '20',
    status: 'FAILED',
  });

  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.dispatchRecordId, 'dispatch_1');
  assert.equal(result.items[0]?.eventLabel, '内容被人工下架');
  assert.equal(result.items[0]?.status, NotificationDispatchStatus.FAILED);
  assert.equal(result.items[0]?.failureCode, 'OPENID_MISSING');
  assert.equal(result.items[0]?.failureReason, '未绑定 OpenID');
});

test('NotificationsService.listNotificationDispatchRecords filters by normalized failure code', async () => {
  let receivedWhere: unknown;
  const prisma = {
    notificationDispatchRecord: {
      findMany: async ({
        where,
      }: {
        where: unknown;
      }) => {
        receivedWhere = where;
        return [
          {
            id: 'dispatch_1',
            channel: NotificationChannel.WECHAT_MP,
            status: NotificationDispatchStatus.FAILED,
            providerResponse: 'openid missing',
            sentAt: null,
            createdAt: new Date('2026-05-19T10:00:00.000Z'),
            message: {
              id: 'msg_1',
              memberId: 'mem_1',
              messageType: NotificationMessageType.CONTENT_TAKEDOWN,
              title: '内容已下架',
              content: '请返回编辑页处理',
            },
          },
          {
            id: 'dispatch_2',
            channel: NotificationChannel.WECHAT_MP,
            status: NotificationDispatchStatus.FAILED,
            providerResponse: 'service unavailable',
            sentAt: null,
            createdAt: new Date('2026-05-19T09:00:00.000Z'),
            message: {
              id: 'msg_2',
              memberId: 'mem_2',
              messageType: NotificationMessageType.CONTENT_TAKEDOWN,
              title: '内容已下架',
              content: '请返回编辑页处理',
            },
          },
        ];
      },
    },
  };

  const service = new NotificationsService(prisma as never, noopQueue as never);
  const result = await service.listNotificationDispatchRecords({
    page: '1',
    pageSize: '20',
    failureCode: 'OPENID_MISSING',
  });

  assert.deepEqual(receivedWhere, {
    status: NotificationDispatchStatus.FAILED,
  });
  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.dispatchRecordId, 'dispatch_1');
  assert.equal(result.items[0]?.failureCode, 'OPENID_MISSING');
});

test('NotificationsService.listNotificationFailureSummary returns grouped failures', async () => {
  const prisma = {
    notificationDispatchRecord: {
      findMany: async () => [
        {
          id: 'dispatch_2',
          messageId: 'msg_1',
          channel: NotificationChannel.WECHAT_MP,
          providerResponse: 'openid missing',
          createdAt: new Date('2026-05-19T10:01:00.000Z'),
          message: {
            messageType: NotificationMessageType.CONTENT_TAKEDOWN,
          },
        },
        {
          id: 'dispatch_1',
          messageId: 'msg_1',
          channel: NotificationChannel.WECHAT_MP,
          providerResponse: 'openid missing',
          createdAt: new Date('2026-05-19T10:00:00.000Z'),
          message: {
            messageType: NotificationMessageType.CONTENT_TAKEDOWN,
          },
        },
        {
          id: 'dispatch_3',
          messageId: 'msg_2',
          channel: NotificationChannel.IN_APP,
          providerResponse: null,
          createdAt: new Date('2026-05-19T09:00:00.000Z'),
          message: {
            messageType: NotificationMessageType.ACTIVATE_SUCCESS,
          },
        },
      ],
    },
  };

  const service = new NotificationsService(prisma as never, noopQueue as never);
  const result = await service.listNotificationFailureSummary({
    page: '1',
    pageSize: '20',
  });

  assert.equal(result.total, 2);
  assert.equal(result.items[0]?.messageType, NotificationMessageType.CONTENT_TAKEDOWN);
  assert.equal(result.items[0]?.channel, NotificationChannel.WECHAT_MP);
  assert.equal(result.items[0]?.failureCode, 'OPENID_MISSING');
  assert.equal(result.items[0]?.failureReason, '未绑定 OpenID');
  assert.equal(result.items[0]?.sampleReason, 'openid missing');
  assert.equal(result.items[0]?.failedCount, 2);
  assert.equal(result.items[0]?.affectedMessages, 1);
  assert.equal(result.items[1]?.failureCode, 'UNKNOWN_REASON');
  assert.equal(result.items[1]?.failureReason, '未知原因');
});

test('NotificationsService.listNotificationFailureSummary filters by normalized failure code', async () => {
  const prisma = {
    notificationDispatchRecord: {
      findMany: async () => [
        {
          id: 'dispatch_2',
          messageId: 'msg_1',
          channel: NotificationChannel.WECHAT_MP,
          providerResponse: 'openid missing',
          createdAt: new Date('2026-05-19T10:01:00.000Z'),
          message: {
            messageType: NotificationMessageType.CONTENT_TAKEDOWN,
          },
        },
        {
          id: 'dispatch_3',
          messageId: 'msg_2',
          channel: NotificationChannel.IN_APP,
          providerResponse: 'service unavailable',
          createdAt: new Date('2026-05-19T09:00:00.000Z'),
          message: {
            messageType: NotificationMessageType.ACTIVATE_SUCCESS,
          },
        },
      ],
    },
  };

  const service = new NotificationsService(prisma as never, noopQueue as never);
  const result = await service.listNotificationFailureSummary({
    page: '1',
    pageSize: '20',
    failureCode: 'OPENID_MISSING',
  });

  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.failureCode, 'OPENID_MISSING');
  assert.equal(result.items[0]?.messageType, NotificationMessageType.CONTENT_TAKEDOWN);
});

test('NotificationsService.getNotificationDispatchRecord returns detail row', async () => {
  const prisma = {
    notificationDispatchRecord: {
      findUnique: async () => ({
        id: 'dispatch_1',
        channel: NotificationChannel.WECHAT_MP,
        status: NotificationDispatchStatus.FAILED,
        providerResponse: 'openid missing',
        sentAt: null,
        createdAt: new Date('2026-05-19T10:00:00.000Z'),
        message: {
          id: 'msg_1',
          memberId: 'mem_1',
          messageType: NotificationMessageType.CONTENT_TAKEDOWN,
          title: '内容已下架',
          content: '请返回编辑页处理',
        },
      }),
    },
  };

  const service = new NotificationsService(prisma as never, noopQueue as never);
  const result = await service.getNotificationDispatchRecord('dispatch_1');

  assert.equal(result.dispatchRecordId, 'dispatch_1');
  assert.equal(result.messageId, 'msg_1');
  assert.equal(result.status, NotificationDispatchStatus.FAILED);
  assert.equal(result.eventLabel, '内容被人工下架');
  assert.equal(result.failureCode, 'OPENID_MISSING');
  assert.equal(result.failureReason, '未绑定 OpenID');
});

test('NotificationsService.getNotificationDispatchHistory returns ordered attempts', async () => {
  const prisma = {
    notificationDispatchRecord: {
      findUnique: async () => ({
        id: 'dispatch_2',
        messageId: 'msg_1',
        channel: NotificationChannel.WECHAT_MP,
      }),
      findMany: async () => [
        {
          id: 'dispatch_1',
          status: NotificationDispatchStatus.FAILED,
          providerResponse: 'openid missing',
          sentAt: null,
          createdAt: new Date('2026-05-19T10:00:00.000Z'),
        },
        {
          id: 'dispatch_2',
          status: NotificationDispatchStatus.SENT,
          providerResponse: 'accepted',
          sentAt: new Date('2026-05-19T10:02:00.000Z'),
          createdAt: new Date('2026-05-19T10:01:00.000Z'),
        },
      ],
    },
  };

  const service = new NotificationsService(prisma as never, noopQueue as never);
  const result = await service.getNotificationDispatchHistory('dispatch_2');

  assert.equal(result.dispatchRecordId, 'dispatch_2');
  assert.equal(result.messageId, 'msg_1');
  assert.equal(result.channel, NotificationChannel.WECHAT_MP);
  assert.equal(result.totalAttempts, 2);
  assert.equal(result.attempts[0]?.attemptNo, 1);
  assert.equal(result.attempts[0]?.status, NotificationDispatchStatus.FAILED);
  assert.equal(result.attempts[0]?.failureCode, 'OPENID_MISSING');
  assert.equal(result.attempts[0]?.failureReason, '未绑定 OpenID');
  assert.equal(result.attempts[1]?.attemptNo, 2);
  assert.equal(result.attempts[1]?.status, NotificationDispatchStatus.SENT);
  assert.equal(result.attempts[1]?.failureCode, null);
});

test('NotificationsService.retryNotificationDispatch enqueues failed record', async () => {
  const addedJobs: unknown[] = [];
  const prisma = {
    notificationDispatchRecord: {
      findUnique: async () => ({
        id: 'dispatch_1',
        messageId: 'msg_1',
        channel: NotificationChannel.WECHAT_MP,
        status: NotificationDispatchStatus.FAILED,
      }),
    },
  };
  const queue = {
    add: async (...args: unknown[]) => {
      addedJobs.push(args);
      return {};
    },
  };

  const service = new NotificationsService(prisma as never, queue as never);
  const result = await service.retryNotificationDispatch('dispatch_1');

  assert.equal(result.dispatchRecordId, 'dispatch_1');
  assert.equal(result.jobName, 'dispatch');
  assert.equal(addedJobs.length, 1);
});

test('NotificationsService.retryNotificationDispatch rejects non-failed record', async () => {
  const prisma = {
    notificationDispatchRecord: {
      findUnique: async () => ({
        id: 'dispatch_1',
        messageId: 'msg_1',
        channel: NotificationChannel.WECHAT_MP,
        status: NotificationDispatchStatus.SENT,
      }),
    },
  };

  const service = new NotificationsService(prisma as never, {} as never);

  await assert.rejects(
    () => service.retryNotificationDispatch('dispatch_1'),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'NOTIFICATION_DISPATCH_RETRY_NOT_ALLOWED',
  );
});

test('NotificationsService.listNotificationTemplates returns paginated templates', async () => {
  const prisma = {
    notificationTemplate: {
      findMany: async () => [
        {
          id: 'tmpl_1',
          templateKey: NotificationMessageType.ACTIVATE_SUCCESS,
          displayName: '激活成功通知',
          description: '激活后触达会员',
          status: NotificationTemplateStatus.ACTIVE,
          updatedAt: new Date('2026-05-19T10:00:00.000Z'),
          currentVersion: {
            version: 2,
            channels: [{ channel: NotificationChannel.IN_APP }],
          },
        },
      ],
      count: async () => 1,
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };

  const service = new NotificationsService(prisma as never, noopQueue as never);
  const result = await service.listNotificationTemplates({ page: '1', pageSize: '20' });

  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.templateKey, NotificationMessageType.ACTIVATE_SUCCESS);
  assert.equal(result.items[0]?.currentVersion, 2);
  assert.deepEqual(result.items[0]?.channels, [NotificationChannel.IN_APP]);
});

test('NotificationsService.getNotificationTemplate returns detail', async () => {
  const prisma = {
    notificationTemplate: {
      findUnique: async () => ({
        id: 'tmpl_1',
        templateKey: NotificationMessageType.ACTIVATE_SUCCESS,
        displayName: '激活成功通知',
        description: '激活后触达会员',
        status: NotificationTemplateStatus.ACTIVE,
        createdAt: new Date('2026-05-19T08:00:00.000Z'),
        updatedAt: new Date('2026-05-19T10:00:00.000Z'),
        currentVersion: {
          id: 'ver_2',
          version: 2,
          channels: [
            {
              channel: NotificationChannel.IN_APP,
              title: '激活成功',
              content: '你的藏品已激活',
            },
          ],
        },
        versions: [
          {
            id: 'ver_2',
            version: 2,
            changeNote: '优化文案',
            channels: [
              {
                channel: NotificationChannel.IN_APP,
                title: '激活成功',
                content: '你的藏品已激活',
              },
              {
                channel: NotificationChannel.WECHAT_MP,
                title: '公众号激活通知',
                content: '请前往小程序查看',
              },
            ],
            createdAt: new Date('2026-05-19T10:00:00.000Z'),
          },
        ],
      }),
    },
  };

  const service = new NotificationsService(prisma as never, noopQueue as never);
  const result = await service.getNotificationTemplate('tmpl_1');

  assert.equal(result.templateId, 'tmpl_1');
  assert.equal(result.currentVersion, 2);
  assert.equal(result.channels[0]?.channel, NotificationChannel.IN_APP);
  assert.equal(result.versions[0]?.version, 2);
  assert.equal(result.versions[0]?.channels[1]?.channel, NotificationChannel.WECHAT_MP);
});

test('NotificationsService.createNotificationTemplate creates first version', async () => {
  const calls: string[] = [];
  const prisma = {
    notificationTemplate: {
      findUnique: async () => null,
    },
    $transaction: async (
      callback: (tx: {
        notificationTemplate: {
          create: (args: unknown) => Promise<{ id: string }>
          update: (args: unknown) => Promise<{
            id: string
            templateKey: NotificationMessageType
            updatedAt: Date
          }>
        }
        notificationTemplateVersion: {
          create: (args: unknown) => Promise<{ id: string; version: number }>
        }
      }) => Promise<unknown>,
    ) =>
      callback({
        notificationTemplate: {
          create: async () => {
            calls.push('template.create');
            return { id: 'tmpl_1' };
          },
          update: async () => {
            calls.push('template.update');
            return {
              id: 'tmpl_1',
              templateKey: NotificationMessageType.ACTIVATE_SUCCESS,
              updatedAt: new Date('2026-05-19T10:00:00.000Z'),
            };
          },
        },
        notificationTemplateVersion: {
          create: async () => {
            calls.push('version.create');
            return { id: 'ver_1', version: 1 };
          },
        },
      }),
  };

  const service = new NotificationsService(prisma as never, noopQueue as never);
  const result = await service.createNotificationTemplate({
    templateKey: 'ACTIVATE_SUCCESS',
    displayName: '激活成功通知',
    description: '激活后触达会员',
    channels: [
      {
        channel: 'IN_APP',
        title: '激活成功',
        content: '你的藏品已激活',
      },
    ],
  });

  assert.deepEqual(calls, ['template.create', 'version.create', 'template.update']);
  assert.equal(result.templateId, 'tmpl_1');
  assert.equal(result.currentVersion, 1);
});

test('NotificationsService.updateNotificationTemplate creates next version', async () => {
  const prisma = {
    notificationTemplate: {
      findUnique: async () => ({
        id: 'tmpl_1',
        templateKey: NotificationMessageType.ACTIVATE_SUCCESS,
        currentVersion: { version: 2 },
      }),
    },
    $transaction: async (
      callback: (tx: {
        notificationTemplateVersion: {
          create: (args: unknown) => Promise<{ id: string; version: number }>
        }
        notificationTemplate: {
          update: (args: unknown) => Promise<{ id: string; updatedAt: Date }>
        }
      }) => Promise<unknown>,
    ) =>
      callback({
        notificationTemplateVersion: {
          create: async () => ({ id: 'ver_3', version: 3 }),
        },
        notificationTemplate: {
          update: async () => ({
            id: 'tmpl_1',
            updatedAt: new Date('2026-05-19T10:00:00.000Z'),
          }),
        },
      }),
  };

  const service = new NotificationsService(prisma as never, noopQueue as never);
  const result = await service.updateNotificationTemplate('tmpl_1', {
    templateKey: 'ACTIVATE_SUCCESS',
    displayName: '激活成功通知',
    description: '激活后触达会员',
    changeNote: '优化文案',
    channels: [
      {
        channel: 'IN_APP',
        title: '激活成功',
        content: '你的藏品已激活',
      },
    ],
  });

  assert.equal(result.templateId, 'tmpl_1');
  assert.equal(result.currentVersion, 3);
});

test('NotificationsService.updateNotificationTemplate rejects template key change', async () => {
  const prisma = {
    notificationTemplate: {
      findUnique: async () => ({
        id: 'tmpl_1',
        templateKey: NotificationMessageType.ACTIVATE_SUCCESS,
        currentVersion: { version: 2 },
      }),
    },
  };

  const service = new NotificationsService(prisma as never, noopQueue as never);

  await assert.rejects(
    () =>
      service.updateNotificationTemplate('tmpl_1', {
        templateKey: 'CONTENT_APPROVED',
        displayName: '内容审核通过通知',
        description: 'desc',
        channels: [
          {
            channel: 'IN_APP',
            title: '内容审核通过',
            content: '已通过',
          },
        ],
      }),
    (error: unknown) =>
      error instanceof BizError && error.code === 'NOTIFICATION_TEMPLATE_KEY_IMMUTABLE',
  );
});

test('NotificationsService.updateNotificationTemplateStatus updates status', async () => {
  const prisma = {
    notificationTemplate: {
      findUnique: async () => ({ id: 'tmpl_1' }),
      update: async () => ({
        id: 'tmpl_1',
        status: NotificationTemplateStatus.DISABLED,
        updatedAt: new Date('2026-05-19T10:00:00.000Z'),
      }),
    },
  };

  const service = new NotificationsService(prisma as never, noopQueue as never);
  const result = await service.updateNotificationTemplateStatus('tmpl_1', {
    status: 'DISABLED',
  });

  assert.equal(result.templateId, 'tmpl_1');
  assert.equal(result.status, NotificationTemplateStatus.DISABLED);
});
