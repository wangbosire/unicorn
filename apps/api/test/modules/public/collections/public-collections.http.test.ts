import * as assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { test } from 'vitest';
import { ApiExceptionFilter } from '../../../../src/common/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../../../src/common/http/api-response.interceptor';
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
            title: '公开展示',
            summary: '摘要',
            coverImageUrl: null,
            contentPayload: { blocks: [] },
            owner: { memberNo: 'MEM-001', nickname: '会员甲' },
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
  } finally {
    await app.close();
  }
});
