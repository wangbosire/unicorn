import * as assert from 'node:assert/strict';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { test } from 'vitest';
import { ApiExceptionFilter } from '../../../../src/common/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../../../src/common/http/api-response.interceptor';
import { AdminAccessGuard } from '../../../../src/modules/admin/auth/admin-access.guard';
import { NotificationsController } from '../../../../src/modules/admin/notifications/notifications.controller';
import { NotificationsService } from '../../../../src/modules/admin/notifications/notifications.service';

async function createNotificationsHttpApp(
  mock: Pick<NotificationsService, 'getNotificationsOverview'> &
    Partial<
      Pick<
        NotificationsService,
        | 'getNotificationDispatchRecord'
        | 'getNotificationDispatchHistory'
        | 'listNotificationTemplates'
        | 'listNotificationFailureSummary'
        | 'listNotificationDispatchRecords'
        | 'getNotificationTemplate'
        | 'retryNotificationDispatch'
        | 'createNotificationTemplate'
        | 'updateNotificationTemplate'
        | 'updateNotificationTemplateStatus'
      >
    >,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [NotificationsController],
    providers: [
      {
        provide: NotificationsService,
        useValue: {
          listNotificationTemplates: async () => {
            throw new Error('not used');
          },
          getNotificationDispatchRecord: async () => {
            throw new Error('not used');
          },
          getNotificationDispatchHistory: async () => {
            throw new Error('not used');
          },
          listNotificationFailureSummary: async () => {
            throw new Error('not used');
          },
          listNotificationDispatchRecords: async () => {
            throw new Error('not used');
          },
          getNotificationTemplate: async () => {
            throw new Error('not used');
          },
          retryNotificationDispatch: async () => {
            throw new Error('not used');
          },
          createNotificationTemplate: async () => {
            throw new Error('not used');
          },
          updateNotificationTemplate: async () => {
            throw new Error('not used');
          },
          updateNotificationTemplateStatus: async () => {
            throw new Error('not used');
          },
          ...mock,
        },
      },
    ],
  })
    .overrideGuard(AdminAccessGuard)
    .useValue({ canActivate: () => true })
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.init();
  return app;
}

test('GET /admin-api/notifications/overview returns wrapped notification summary', async () => {
  const app = await createNotificationsHttpApp({
    getNotificationsOverview: async () => ({
      totalMessages: 3,
      unreadMessages: 2,
      pendingDispatches: 1,
      failedDispatches: 1,
      items: [
        {
          messageType: 'CONTENT_TAKEDOWN',
          eventLabel: '内容被人工下架',
          latestTitle: '你的公开内容已被人工下架',
          latestContent: '请返回编辑页查看详情',
          channels: ['IN_APP', 'WECHAT_MP'],
          latestDispatchStatus: 'FAILED',
          latestDispatchNote: 'openid not bound',
          totalMessages: 1,
          pendingDispatches: 0,
          failedDispatches: 1,
          lastSentAt: 1_716_025_805_000,
          latestCreatedAt: 1_716_025_800_000,
        },
      ],
      generatedAt: 1_716_130_000_000,
    }),
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/notifications/overview')
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.totalMessages, 3);
    assert.equal(response.body.data.items[0]?.messageType, 'CONTENT_TAKEDOWN');
    assert.equal(response.body.data.items[0]?.latestDispatchStatus, 'FAILED');
  } finally {
    await app.close();
  }
});

test('GET /admin-api/notifications/templates returns wrapped paginated templates', async () => {
  const app = await createNotificationsHttpApp({
    getNotificationsOverview: async () => {
      throw new Error('not used');
    },
    listNotificationTemplates: async () => ({
      items: [
        {
          templateId: 'tmpl_1',
          templateKey: 'ACTIVATE_SUCCESS',
          displayName: '激活成功通知',
          description: '激活后触达会员',
          status: 'ACTIVE',
          currentVersion: 2,
          channels: ['IN_APP', 'WECHAT_MP'],
          updatedAt: 1_716_130_100_000,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    }),
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/notifications/templates')
      .query({ page: '1', pageSize: '20', status: 'ACTIVE' })
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.total, 1);
    assert.equal(response.body.data.items[0]?.templateKey, 'ACTIVATE_SUCCESS');
    assert.deepEqual(response.body.data.items[0]?.channels, ['IN_APP', 'WECHAT_MP']);
  } finally {
    await app.close();
  }
});

test('GET /admin-api/notifications/dispatch-records returns wrapped paginated records', async () => {
  const app = await createNotificationsHttpApp({
    getNotificationsOverview: async () => {
      throw new Error('not used');
    },
    listNotificationDispatchRecords: async (query) => {
      assert.equal(query.failureCode, 'OPENID_MISSING');
      return {
        items: [
          {
            dispatchRecordId: 'dispatch_1',
            messageId: 'msg_1',
            messageType: 'CONTENT_TAKEDOWN',
            eventLabel: '内容被人工下架',
            memberId: 'mem_1',
            title: '你的公开内容已被人工下架',
            content: '请返回编辑页查看详情',
            channel: 'WECHAT_MP',
            status: 'FAILED',
            failureCode: 'OPENID_MISSING',
            failureReason: '未绑定 OpenID',
            providerResponse: 'openid not bound',
            sentAt: null,
            createdAt: 1_716_130_100_000,
          },
        ],
        page: 1,
        pageSize: 20,
        total: 1,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/notifications/dispatch-records')
      .query({
        page: '1',
        pageSize: '20',
        status: 'FAILED',
        failureCode: 'OPENID_MISSING',
      })
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.total, 1);
    assert.equal(response.body.data.items[0]?.dispatchRecordId, 'dispatch_1');
    assert.equal(response.body.data.items[0]?.status, 'FAILED');
  } finally {
    await app.close();
  }
});

test('GET /admin-api/notifications/failure-summary returns wrapped grouped failures', async () => {
  const app = await createNotificationsHttpApp({
    getNotificationsOverview: async () => {
      throw new Error('not used');
    },
    listNotificationFailureSummary: async (query) => {
      assert.equal(query.failureCode, 'OPENID_MISSING');
      return {
        items: [
          {
            messageType: 'CONTENT_TAKEDOWN',
            eventLabel: '内容被人工下架',
            channel: 'WECHAT_MP',
            failureCode: 'OPENID_MISSING',
            failureReason: '未绑定 OpenID',
            sampleReason: 'openid not bound',
            failedCount: 3,
            affectedMessages: 2,
            latestFailedAt: 1_716_130_100_000,
            latestDispatchRecordId: 'dispatch_3',
          },
        ],
        page: 1,
        pageSize: 10,
        total: 1,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/notifications/failure-summary')
      .query({
        page: '1',
        pageSize: '10',
        channel: 'WECHAT_MP',
        failureCode: 'OPENID_MISSING',
      })
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.total, 1);
    assert.equal(response.body.data.items[0]?.failureCode, 'OPENID_MISSING');
    assert.equal(response.body.data.items[0]?.failureReason, '未绑定 OpenID');
    assert.equal(response.body.data.items[0]?.failedCount, 3);
  } finally {
    await app.close();
  }
});

test('GET /admin-api/notifications/dispatch-records/:dispatchRecordId returns wrapped detail', async () => {
  const app = await createNotificationsHttpApp({
    getNotificationsOverview: async () => {
      throw new Error('not used');
    },
    getNotificationDispatchRecord: async (dispatchRecordId) => {
      assert.equal(dispatchRecordId, 'dispatch_1');
      return {
        dispatchRecordId,
        messageId: 'msg_1',
        messageType: 'CONTENT_TAKEDOWN',
        eventLabel: '内容被人工下架',
        memberId: 'mem_1',
        title: '你的公开内容已被人工下架',
        content: '请返回编辑页查看详情',
        channel: 'WECHAT_MP',
        status: 'FAILED',
        failureCode: 'OPENID_MISSING',
        failureReason: '未绑定 OpenID',
        providerResponse: 'openid not bound',
        sentAt: null,
        createdAt: 1_716_130_100_000,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/notifications/dispatch-records/dispatch_1')
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.dispatchRecordId, 'dispatch_1');
    assert.equal(response.body.data.status, 'FAILED');
  } finally {
    await app.close();
  }
});

test('GET /admin-api/notifications/dispatch-records/:dispatchRecordId/history returns wrapped attempts', async () => {
  const app = await createNotificationsHttpApp({
    getNotificationsOverview: async () => {
      throw new Error('not used');
    },
    getNotificationDispatchHistory: async (dispatchRecordId) => {
      assert.equal(dispatchRecordId, 'dispatch_2');
      return {
        dispatchRecordId,
        messageId: 'msg_1',
        channel: 'WECHAT_MP',
        totalAttempts: 2,
        attempts: [
          {
            dispatchRecordId: 'dispatch_1',
            attemptNo: 1,
            status: 'FAILED',
            failureCode: 'OPENID_MISSING',
            failureReason: '未绑定 OpenID',
            providerResponse: 'openid missing',
            sentAt: null,
            createdAt: 1_716_130_000_000,
          },
          {
            dispatchRecordId: 'dispatch_2',
            attemptNo: 2,
            status: 'SENT',
            failureCode: null,
            failureReason: null,
            providerResponse: 'accepted',
            sentAt: 1_716_130_120_000,
            createdAt: 1_716_130_060_000,
          },
        ],
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/notifications/dispatch-records/dispatch_2/history')
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.totalAttempts, 2);
    assert.equal(response.body.data.attempts[0]?.attemptNo, 1);
    assert.equal(response.body.data.attempts[1]?.status, 'SENT');
  } finally {
    await app.close();
  }
});

test('POST /admin-api/notifications/dispatch-records/:dispatchRecordId/retry returns wrapped payload', async () => {
  const app = await createNotificationsHttpApp({
    getNotificationsOverview: async () => {
      throw new Error('not used');
    },
    retryNotificationDispatch: async (dispatchRecordId) => {
      assert.equal(dispatchRecordId, 'dispatch_1');
      return {
        dispatchRecordId,
        messageId: 'msg_1',
        channel: 'WECHAT_MP',
        jobName: 'dispatch',
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .post('/admin-api/notifications/dispatch-records/dispatch_1/retry')
      .expect(201);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.dispatchRecordId, 'dispatch_1');
    assert.equal(response.body.data.jobName, 'dispatch');
  } finally {
    await app.close();
  }
});

test('GET /admin-api/notifications/templates/:templateId returns wrapped detail', async () => {
  const app = await createNotificationsHttpApp({
    getNotificationsOverview: async () => {
      throw new Error('not used');
    },
    getNotificationTemplate: async (templateId) => {
      assert.equal(templateId, 'tmpl_1');
      return {
        templateId,
        templateKey: 'ACTIVATE_SUCCESS',
        displayName: '激活成功通知',
        description: '激活后触达会员',
        status: 'ACTIVE',
        currentVersionId: 'ver_2',
        currentVersion: 2,
        channels: [
          {
            channel: 'IN_APP',
            title: '激活成功',
            content: '你的藏品已激活',
          },
        ],
        versions: [
          {
            versionId: 'ver_2',
            version: 2,
            changeNote: '新增公众号文案',
            channels: [
              {
                channel: 'IN_APP',
                title: '激活成功',
                content: '你的藏品已激活',
              },
              {
                channel: 'WECHAT_MP',
                title: '公众号激活通知',
                content: '请前往小程序查看你的新藏品',
              },
            ],
            createdAt: 1_716_130_000_000,
          },
        ],
        createdAt: 1_716_120_000_000,
        updatedAt: 1_716_130_100_000,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/notifications/templates/tmpl_1')
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.currentVersion, 2);
    assert.equal(response.body.data.channels[0]?.channel, 'IN_APP');
    assert.equal(response.body.data.versions[0]?.channels[1]?.channel, 'WECHAT_MP');
  } finally {
    await app.close();
  }
});

test('POST /admin-api/notifications/templates returns wrapped create payload', async () => {
  const app = await createNotificationsHttpApp({
    getNotificationsOverview: async () => {
      throw new Error('not used');
    },
    createNotificationTemplate: async (body) => {
      assert.equal(body.templateKey, 'ACTIVATE_SUCCESS');
      assert.equal(body.channels[0]?.channel, 'IN_APP');
      return {
        templateId: 'tmpl_1',
        templateKey: 'ACTIVATE_SUCCESS',
        currentVersion: 1,
        updatedAt: 1_716_130_100_000,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .post('/admin-api/notifications/templates')
      .send({
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
      })
      .expect(201);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.templateId, 'tmpl_1');
    assert.equal(response.body.data.currentVersion, 1);
  } finally {
    await app.close();
  }
});

test('PATCH /admin-api/notifications/templates/:templateId returns wrapped update payload', async () => {
  const app = await createNotificationsHttpApp({
    getNotificationsOverview: async () => {
      throw new Error('not used');
    },
    updateNotificationTemplate: async (templateId, body) => {
      assert.equal(templateId, 'tmpl_1');
      assert.equal(body.changeNote, '优化文案');
      return {
        templateId,
        currentVersion: 3,
        updatedAt: 1_716_130_100_000,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .patch('/admin-api/notifications/templates/tmpl_1')
      .send({
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
      })
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.currentVersion, 3);
  } finally {
    await app.close();
  }
});

test('PATCH /admin-api/notifications/templates/:templateId/status returns wrapped status payload', async () => {
  const app = await createNotificationsHttpApp({
    getNotificationsOverview: async () => {
      throw new Error('not used');
    },
    updateNotificationTemplateStatus: async (templateId, body) => {
      assert.equal(templateId, 'tmpl_1');
      assert.equal(body.status, 'DISABLED');
      return {
        templateId,
        status: 'DISABLED',
        updatedAt: 1_716_130_100_000,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .patch('/admin-api/notifications/templates/tmpl_1/status')
      .send({ status: 'DISABLED' })
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.status, 'DISABLED');
  } finally {
    await app.close();
  }
});
