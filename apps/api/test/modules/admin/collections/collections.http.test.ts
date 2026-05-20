import * as assert from 'node:assert/strict';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { test } from 'vitest';
import { ApiExceptionFilter } from '../../../../src/common/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../../../src/common/http/api-response.interceptor';
import { BizError } from '../../../../src/common/http/biz-error';
import { AdminAccessGuard } from '../../../../src/modules/admin/auth/admin-access.guard';
import { CollectionsController } from '../../../../src/modules/admin/collections/collections.controller';
import { CollectionsService } from '../../../../src/modules/admin/collections/collections.service';

type CollectionsHttpServiceMock = Pick<
  CollectionsService,
  'listCollections' | 'getCollectionById' | 'updateCollectionStatus'
>;

async function createCollectionsHttpApp(
  mock: Partial<CollectionsHttpServiceMock>,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [CollectionsController],
    providers: [
      {
        provide: CollectionsService,
        useValue: {
          listCollections: async () => {
            throw new Error('not used');
          },
          getCollectionById: async () => {
            throw new Error('not used');
          },
          updateCollectionStatus: async () => {
            throw new Error('not used');
          },
          ...mock,
        },
      },
    ],
  })
    .overrideGuard(AdminAccessGuard)
    .useValue({
      canActivate: (context: { switchToHttp: () => { getRequest: () => { admin?: unknown } } }) => {
        const request = context.switchToHttp().getRequest();
        request.admin = {
          id: 'admin_1',
          username: 'admin',
          accountNo: 'ADMIN-001',
          authzVersion: 1,
          permissionKeys: ['*'],
        };
        return true;
      },
    })
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.init();
  return app;
}

test('GET /admin-api/collections returns wrapped list', async () => {
  const app = await createCollectionsHttpApp({
    listCollections: async () => ({
      items: [
        {
          id: 'col_1',
          collectionNo: 'COL-001',
          seriesName: '星辉远征',
          batchName: '第一批',
          status: 'OWNED',
          currentOwnerMemberId: 'mem_1',
          ownerMemberNo: 'MEM-001',
          ownerMemberNickname: '小王',
          latestContentPublishStatus: 'PUBLISHED',
          latestContentReviewStatus: 'MANUAL_APPROVED',
          claimedAt: '2026-05-10T08:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    }),
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/collections')
      .query({ page: '1', pageSize: '20', status: 'OWNED' })
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.total, 1);
    assert.equal(response.body.data.items[0]?.collectionNo, 'COL-001');
    assert.equal(response.body.data.items[0]?.ownerMemberNo, 'MEM-001');
    assert.equal(
      response.body.data.items[0]?.latestContentReviewStatus,
      'MANUAL_APPROVED',
    );
  } finally {
    await app.close();
  }
});

test('GET /admin-api/collections/:collectionId returns wrapped detail', async () => {
  const app = await createCollectionsHttpApp({
    getCollectionById: async (collectionId) => {
      assert.equal(collectionId, 'col_1');
      return {
        id: 'col_1',
        collectionNo: 'COL-001',
        seriesId: 'ser_1',
        seriesName: '星辉远征',
        batchId: 'bat_1',
        batchName: '第一批',
        status: 'OWNED',
        owner: {
          memberId: 'mem_1',
          memberNo: 'MEM-001',
          nickname: '小王',
        },
        claimedAt: 1_715_327_200_000,
        latestContentVersion: null,
        publishedContentVersion: null,
        contentVersionCount: 2,
        commentsCount: 3,
        latestCommentAt: 1_715_601_600_000,
        reviewRecordCount: 0,
        createdAt: 1_715_240_800_000,
        updatedAt: 1_715_327_200_000,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/collections/col_1')
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.owner.memberNo, 'MEM-001');
    assert.equal(response.body.data.collectionNo, 'COL-001');
    assert.equal(response.body.data.contentVersionCount, 2);
    assert.equal(response.body.data.commentsCount, 3);
  } finally {
    await app.close();
  }
});

test('PATCH /admin-api/collections/:collectionId/status returns wrapped payload', async () => {
  const app = await createCollectionsHttpApp({
    updateCollectionStatus: async (collectionId, body) => {
      assert.equal(collectionId, 'col_1');
      assert.equal(body.status, 'FROZEN');
      return {
        id: 'col_1',
        collectionNo: 'COL-001',
        status: 'FROZEN',
        updatedAt: 1_715_788_800_000,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .patch('/admin-api/collections/col_1/status')
      .send({ status: 'FROZEN' })
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.deepEqual(response.body.data, {
      id: 'col_1',
      collectionNo: 'COL-001',
      status: 'FROZEN',
      updatedAt: 1_715_788_800_000,
    });
  } finally {
    await app.close();
  }
});

test('GET /admin-api/collections propagates BizError', async () => {
  const app = await createCollectionsHttpApp({
    listCollections: async () => {
      throw new BizError({
        code: 'INVALID_COLLECTION_STATUS',
        message: 'invalid collection status',
      });
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/collections')
      .query({ status: 'INVALID' })
      .expect(400);

    assert.deepEqual(response.body, {
      code: 'INVALID_COLLECTION_STATUS',
      message: 'invalid collection status',
    });
  } finally {
    await app.close();
  }
});
