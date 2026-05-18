import * as assert from 'node:assert/strict';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { test } from 'vitest';
import { ApiExceptionFilter } from '../../../../src/common/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../../../src/common/http/api-response.interceptor';
import { BizError } from '../../../../src/common/http/biz-error';
import { AdminAccessGuard } from '../../../../src/modules/admin/auth/admin-access.guard';
import { SeriesController } from '../../../../src/modules/issuance/series/series.controller';
import { SeriesService } from '../../../../src/modules/issuance/series/series.service';

test('GET /admin-api/series returns wrapped success response', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [SeriesController],
    providers: [
      {
        provide: SeriesService,
        useValue: {
          listSeries: async () => ({
            items: [
              {
                id: 'ser_1',
                seriesNo: 'SER-20260514-AAAA',
                name: '星辉远征',
                description: '星际探索主题系列',
                status: 'ENABLED',
                batchCount: 2,
                enabledBatchCount: 2,
                collectionCount: 12,
                createdAt: new Date('2026-05-14T10:00:00.000Z').getTime(),
              },
            ],
            page: 1,
            pageSize: 20,
            total: 1,
          }),
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

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/series')
      .query({ page: '1', pageSize: '20', status: 'ENABLED' })
      .expect(200);

    assert.deepEqual(response.body, {
      code: 'OK',
      message: 'success',
      data: {
        items: [
          {
            id: 'ser_1',
            seriesNo: 'SER-20260514-AAAA',
            name: '星辉远征',
            description: '星际探索主题系列',
            status: 'ENABLED',
            batchCount: 2,
            enabledBatchCount: 2,
            collectionCount: 12,
            createdAt: new Date('2026-05-14T10:00:00.000Z').getTime(),
          },
        ],
        page: 1,
        pageSize: 20,
        total: 1,
      },
    });
  } finally {
    await closeApp(app);
  }
});

test('GET /admin-api/series returns wrapped BizError response', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [SeriesController],
    providers: [
      {
        provide: SeriesService,
        useValue: {
          listSeries: async () => {
            throw new BizError({
              code: 'INVALID_SERIES_STATUS',
              message: 'invalid series status',
            });
          },
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

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/series')
      .query({ status: 'INVALID' })
      .expect(400);

    assert.deepEqual(response.body, {
      code: 'INVALID_SERIES_STATUS',
      message: 'invalid series status',
    });
  } finally {
    await closeApp(app);
  }
});

async function closeApp(app: INestApplication) {
  await app.close();
}
