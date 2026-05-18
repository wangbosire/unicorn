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
  mock: Pick<NotificationsService, 'getNotificationsOverview'>,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [NotificationsController],
    providers: [
      {
        provide: NotificationsService,
        useValue: mock,
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
