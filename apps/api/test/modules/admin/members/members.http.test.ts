import * as assert from 'node:assert/strict';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { test } from 'vitest';
import { ApiExceptionFilter } from '../../../../src/common/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../../../src/common/http/api-response.interceptor';
import { AdminAccessGuard } from '../../../../src/modules/admin/auth/admin-access.guard';
import { MembersController } from '../../../../src/modules/admin/members/members.controller';
import { MembersService } from '../../../../src/modules/admin/members/members.service';

async function createMembersHttpApp(
  mock: Pick<MembersService, 'listMembers'> &
    Partial<Pick<MembersService, 'getMemberById' | 'updateMemberStatus'>>,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [MembersController],
    providers: [
      {
        provide: MembersService,
        useValue: {
          getMemberById: async () => {
            throw new Error('not used');
          },
          updateMemberStatus: async () => {
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

test('GET /admin-api/members returns wrapped paginated list', async () => {
  const app = await createMembersHttpApp({
    listMembers: async () => ({
      items: [
        {
          memberId: 'm1',
          memberNo: 'MEM-001',
          nickname: '甲',
          mobile: null,
          status: 'ACTIVE',
          registeredAt: 1_000,
          wechatChannelsSummary: '微信小程序',
          ownedCollectionsCount: 2,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    }),
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/members')
      .query({ page: '1', pageSize: '20' })
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.total, 1);
    assert.equal(response.body.data.items[0]?.memberNo, 'MEM-001');
    assert.equal(response.body.data.items[0]?.ownedCollectionsCount, 2);
  } finally {
    await app.close();
  }
});

test('GET /admin-api/members/:memberId returns wrapped detail', async () => {
  const app = await createMembersHttpApp({
    listMembers: async () => {
      throw new Error('not used');
    },
    getMemberById: async (memberId) => {
      assert.equal(memberId, 'm1');
      return {
        memberId: 'm1',
        memberNo: 'MEM-001',
        nickname: '甲',
        avatarUrl: 'https://example.com/avatar.png',
        mobile: '13800000000',
        status: 'ACTIVE',
        registeredAt: 1_000,
        wechatChannels: ['微信小程序'],
        ownedCollectionsCount: 2,
        createdContentVersionsCount: 3,
        commentsCount: 1,
        latestCommentAt: 1_050,
        createdAt: 900,
        updatedAt: 1_100,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/members/m1')
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.memberNo, 'MEM-001');
    assert.deepEqual(response.body.data.wechatChannels, ['微信小程序']);
    assert.equal(response.body.data.createdContentVersionsCount, 3);
    assert.equal(response.body.data.commentsCount, 1);
  } finally {
    await app.close();
  }
});

test('PATCH /admin-api/members/:memberId/status returns wrapped payload', async () => {
  const updatedAt = new Date('2026-05-15T12:00:00.000Z').getTime();
  const app = await createMembersHttpApp({
    listMembers: async () => {
      throw new Error('not used');
    },
    updateMemberStatus: async (memberId, body) => {
      assert.equal(memberId, 'm1');
      assert.equal(body.status, 'FROZEN');
      return {
        memberId: 'm1',
        memberNo: 'MEM-001',
        status: 'FROZEN',
        updatedAt,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .patch('/admin-api/members/m1/status')
      .send({ status: 'FROZEN' })
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.deepEqual(response.body.data, {
      memberId: 'm1',
      memberNo: 'MEM-001',
      status: 'FROZEN',
      updatedAt,
    });
  } finally {
    await app.close();
  }
});

test('PATCH /admin-api/members/:memberId/freeze reuses status update flow', async () => {
  const updatedAt = new Date('2026-05-15T12:00:00.000Z').getTime();
  const app = await createMembersHttpApp({
    listMembers: async () => {
      throw new Error('not used');
    },
    updateMemberStatus: async (memberId, body) => {
      assert.equal(memberId, 'm1');
      assert.equal(body.status, 'FROZEN');
      return {
        memberId: 'm1',
        memberNo: 'MEM-001',
        status: 'FROZEN',
        updatedAt,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .patch('/admin-api/members/m1/freeze')
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.status, 'FROZEN');
  } finally {
    await app.close();
  }
});

test('PATCH /admin-api/members/:memberId/unfreeze reuses status update flow', async () => {
  const updatedAt = new Date('2026-05-16T08:00:00.000Z').getTime();
  const app = await createMembersHttpApp({
    listMembers: async () => {
      throw new Error('not used');
    },
    updateMemberStatus: async (memberId, body) => {
      assert.equal(memberId, 'm2');
      assert.equal(body.status, 'ACTIVE');
      return {
        memberId: 'm2',
        memberNo: 'MEM-002',
        status: 'ACTIVE',
        updatedAt,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .patch('/admin-api/members/m2/unfreeze')
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.status, 'ACTIVE');
  } finally {
    await app.close();
  }
});
