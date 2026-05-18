import * as assert from 'node:assert/strict';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { test } from 'vitest';
import { ApiExceptionFilter } from '../../../../src/common/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../../../src/common/http/api-response.interceptor';
import { MemberMessagesController } from '../../../../src/modules/member/messages/member-messages.controller';
import { MemberMessagesService } from '../../../../src/modules/member/messages/member-messages.service';

async function createMemberMessagesHttpApp(
  mock: Pick<MemberMessagesService, 'listMemberMessages' | 'markMemberMessageRead'>,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [MemberMessagesController],
    providers: [
      {
        provide: MemberMessagesService,
        useValue: mock,
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.init();
  return app;
}

test('GET /member-api/my/messages returns wrapped payload', async () => {
  const app = await createMemberMessagesHttpApp({
    listMemberMessages: async () => ({
      items: [
        {
          id: 'msg_1',
          messageType: 'ACTIVATE_SUCCESS',
          title: '激活成功',
          content: '你的藏品已到账',
          isRead: false,
          readAt: null,
          createdAt: 1_716_022_800_000,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    }),
    markMemberMessageRead: async () => ({
      id: 'msg_1',
      isRead: true,
      readAt: 1_716_022_900_000,
    }),
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/member-api/my/messages')
      .set('authorization', 'Bearer member.jwt.token')
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.total, 1);
    assert.equal(response.body.data.items[0]?.id, 'msg_1');
  } finally {
    await app.close();
  }
});

test('PATCH /member-api/my/messages/:messageId/read returns wrapped payload', async () => {
  const app = await createMemberMessagesHttpApp({
    listMemberMessages: async () => ({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    }),
    markMemberMessageRead: async () => ({
      id: 'msg_1',
      isRead: true,
      readAt: 1_716_022_900_000,
    }),
  });

  try {
    const response = await request(app.getHttpServer())
      .patch('/member-api/my/messages/msg_1/read')
      .set('authorization', 'Bearer member.jwt.token')
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.id, 'msg_1');
    assert.equal(response.body.data.isRead, true);
  } finally {
    await app.close();
  }
});
