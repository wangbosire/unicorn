import * as assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { test } from 'vitest';
import { ApiExceptionFilter } from '../../../../src/common/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../../../src/common/http/api-response.interceptor';
import { BizError } from '../../../../src/common/http/biz-error';
import { PublicCollectionsController } from '../../../../src/modules/public/collections/public-collections.controller';
import { PublicCollectionsService } from '../../../../src/modules/public/collections/public-collections.service';

test('GET /public-api/collections/:slug returns wrapped public snapshot', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [PublicCollectionsController],
    providers: [
      {
        provide: PublicCollectionsService,
        useValue: {
          getPublicCollectionBySlug: async () => ({
            collectionNo: 'COL-001',
            slug: 'COL-001',
            seriesId: 'ser_1',
            seriesNo: 'SER-001',
            seriesName: '星辉远征',
            batchId: 'bat_1',
            batchNo: 'BAT-001',
            batchName: '首发批次',
            contentVersionId: 'ccv_1',
            versionNo: 1,
            title: '公开展示',
            summary: '摘要',
            coverImageUrl: null,
            contentPayload: { blocks: [] },
            owner: { memberNo: 'MEM-001', nickname: '会员甲', avatarUrl: null },
            topLevelCommentCount: 2,
            totalCommentCount: 5,
            publishedAt: '2026-05-14T12:00:00.000Z',
          }),
        },
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());

  await app.init();

  try {
    const response = await request(app.getHttpServer())
      .get('/public-api/collections/COL-001')
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.title, '公开展示');
    assert.equal(response.body.data.owner.nickname, '会员甲');
    assert.equal(response.body.data.seriesNo, 'SER-001');
    assert.equal(response.body.data.totalCommentCount, 5);
  } finally {
    await app.close();
  }
});

test('GET /public-api/collections/:slug returns 410 when public snapshot is takedown', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [PublicCollectionsController],
    providers: [
      {
        provide: PublicCollectionsService,
        useValue: {
          getPublicCollectionBySlug: async () => {
            throw new BizError({
              code: 'PUBLIC_COLLECTION_TAKEDOWN',
              message: 'public collection takedown',
              status: 410,
            });
          },
        },
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());

  await app.init();

  try {
    const response = await request(app.getHttpServer())
      .get('/public-api/collections/COL-TAKEDOWN')
      .expect(410);

    assert.deepEqual(response.body, {
      code: 'PUBLIC_COLLECTION_TAKEDOWN',
      message: 'public collection takedown',
    });
  } finally {
    await app.close();
  }
});

test('GET /public-api/collections/:slug/stats returns wrapped stats payload', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [PublicCollectionsController],
    providers: [
      {
        provide: PublicCollectionsService,
        useValue: {
          getPublicCollectionStatsBySlug: async () => ({
            collectionNo: 'COL-001',
            slug: 'COL-001',
            ownerMemberNo: 'MEM-001',
            ownerNickname: '会员甲',
            approvedVersionCount: 2,
            hasPublishedContent: true,
            latestApprovedVersionNo: 2,
            publishedVersionNo: 1,
            topLevelCommentCount: 2,
            totalCommentCount: 5,
            publishedAt: '2026-05-14T12:00:00.000Z',
          }),
        },
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());

  await app.init();

  try {
    const response = await request(app.getHttpServer())
      .get('/public-api/collections/COL-001/stats')
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.approvedVersionCount, 2);
    assert.equal(response.body.data.hasPublishedContent, true);
    assert.equal(response.body.data.publishedVersionNo, 1);
    assert.equal(response.body.data.totalCommentCount, 5);
  } finally {
    await app.close();
  }
});
