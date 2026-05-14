import * as assert from 'node:assert/strict';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { test } from 'vitest';
import { ApiExceptionFilter } from '../../../../src/common/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../../../src/common/http/api-response.interceptor';
import { IssuanceBatchesController } from '../../../../src/modules/issuance/issuance-batches/issuance-batches.controller';
import { IssuanceBatchesService } from '../../../../src/modules/issuance/issuance-batches/issuance-batches.service';

test('GET /admin-api/issuance-batches returns wrapped paginated response', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [IssuanceBatchesController],
    providers: [
      {
        provide: IssuanceBatchesService,
        useValue: {
          listIssuanceBatches: async () => ({
            items: [
              {
                id: 'bat_1',
                batchNo: 'BAT-20260514-AAAA',
                seriesId: 'ser_1',
                seriesName: '星辉远征',
                name: '星辉远征首发',
                quantity: 50,
                generatedCount: 12,
                status: 'ENABLED',
                activateValidFrom: new Date('2026-05-14T00:00:00.000Z').getTime(),
                activateValidTo: new Date('2026-06-14T00:00:00.000Z').getTime(),
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
      .get('/admin-api/issuance-batches')
      .query({ page: '1', pageSize: '20', status: 'ENABLED' })
      .expect(200);

    assert.deepEqual(response.body, {
      code: 'OK',
      message: 'success',
      data: {
        items: [
          {
            id: 'bat_1',
            batchNo: 'BAT-20260514-AAAA',
            seriesId: 'ser_1',
            seriesName: '星辉远征',
            name: '星辉远征首发',
            quantity: 50,
            generatedCount: 12,
            status: 'ENABLED',
            activateValidFrom: new Date('2026-05-14T00:00:00.000Z').getTime(),
            activateValidTo: new Date('2026-06-14T00:00:00.000Z').getTime(),
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
