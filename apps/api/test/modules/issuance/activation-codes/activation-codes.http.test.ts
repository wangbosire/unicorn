import * as assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { test } from 'vitest';
import { ApiExceptionFilter } from '../../../../src/common/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../../../src/common/http/api-response.interceptor';
import { BizError } from '../../../../src/common/http/biz-error';
import { ActivationCodesController } from '../../../../src/modules/issuance/activation-codes/activation-codes.controller';
import { ActivationCodesService } from '../../../../src/modules/issuance/activation-codes/activation-codes.service';

test('GET /admin-api/activation-codes returns wrapped activation code list', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [ActivationCodesController],
    providers: [
      {
        provide: ActivationCodesService,
        useValue: {
          listActivationCodes: async () => ({
            items: [
              {
                id: 'ac_1',
                code: 'ABCD-EFGH-IJKL',
                batchId: 'bat_1',
                batchName: '星辉远征首发',
                collectionId: 'col_1',
                collectionNo: 'COL-20260514-AAAAA',
                status: 'UNISSUED',
                expiredAt: new Date('2026-06-14T00:00:00.000Z').getTime(),
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
      .get('/admin-api/activation-codes')
      .query({ page: '1', pageSize: '20', status: 'UNISSUED' })
      .expect(200);

    assert.deepEqual(response.body, {
      code: 'OK',
      message: 'success',
      data: {
        items: [
          {
            id: 'ac_1',
            code: 'ABCD-EFGH-IJKL',
            batchId: 'bat_1',
            batchName: '星辉远征首发',
            collectionId: 'col_1',
            collectionNo: 'COL-20260514-AAAAA',
            status: 'UNISSUED',
            expiredAt: new Date('2026-06-14T00:00:00.000Z').getTime(),
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

test('POST /admin-api/activation-codes/generate returns wrapped BizError response', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [ActivationCodesController],
    providers: [
      {
        provide: ActivationCodesService,
        useValue: {
          generateActivationCodes: async () => {
            throw new BizError({
              code: 'ACTIVATION_CODE_GENERATION_EXCEEDS_BATCH_QUANTITY',
              message: 'activation code generation exceeds batch quantity',
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
      .post('/admin-api/activation-codes/generate')
      .send({
        batchId: 'bat_1',
        count: 999,
        issuedChannel: 'offline_event',
      })
      .expect(400);

    assert.deepEqual(response.body, {
      code: 'ACTIVATION_CODE_GENERATION_EXCEEDS_BATCH_QUANTITY',
      message: 'activation code generation exceeds batch quantity',
    });
  } finally {
    await app.close();
  }
});
