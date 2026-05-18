import * as assert from 'node:assert/strict';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { test } from 'vitest';
import { ApiExceptionFilter } from '../../../../src/common/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../../../src/common/http/api-response.interceptor';
import { MyCollectionsController } from '../../../../src/modules/member/my-collections/my-collections.controller';
import { MyCollectionsService } from '../../../../src/modules/member/my-collections/my-collections.service';

test('GET /member-api/my/collections returns wrapped member collection list', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [MyCollectionsController],
    providers: [
      {
        provide: MyCollectionsService,
        useValue: {
          listMyCollections: async () => ({
            items: [
              {
                id: 'col_1',
                collectionNo: 'COL-20260514-AAAAA',
                status: 'OWNED',
                seriesNo: 'SER-001',
                seriesName: '星辉远征',
                currentVersionId: 'ccv_1',
                currentVersionNo: 1,
                currentVersionTitle: '我的第一件藏品',
                coverImageUrl: null,
                contentEditStatus: 'APPROVED',
                contentPublishStatus: 'PUBLISHED',
                contentReviewStatus: 'MANUAL_APPROVED',
                contentSubmittedAt: new Date('2026-05-14T07:00:00.000Z').getTime(),
                contentPublishedAt: new Date('2026-05-14T08:00:00.000Z').getTime(),
                claimedAt: new Date('2026-05-14T08:00:00.000Z').getTime(),
              },
            ],
            page: 1,
            pageSize: 20,
            total: 1,
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
      .get('/member-api/my/collections')
      .set('authorization', 'Bearer member.jwt.token')
      .query({ page: '1', pageSize: '20', status: 'OWNED' })
      .expect(200);

    assert.deepEqual(response.body, {
      code: 'OK',
      message: 'success',
      data: {
        items: [
          {
            id: 'col_1',
            collectionNo: 'COL-20260514-AAAAA',
            status: 'OWNED',
            seriesNo: 'SER-001',
            seriesName: '星辉远征',
            currentVersionId: 'ccv_1',
            currentVersionNo: 1,
            currentVersionTitle: '我的第一件藏品',
            coverImageUrl: null,
            contentEditStatus: 'APPROVED',
            contentPublishStatus: 'PUBLISHED',
            contentReviewStatus: 'MANUAL_APPROVED',
            contentSubmittedAt: new Date('2026-05-14T07:00:00.000Z').getTime(),
            contentPublishedAt: new Date('2026-05-14T08:00:00.000Z').getTime(),
            claimedAt: new Date('2026-05-14T08:00:00.000Z').getTime(),
          },
        ],
        page: 1,
        pageSize: 20,
        total: 1,
      },
    });
  } finally {
    await app.close();
  }
});
