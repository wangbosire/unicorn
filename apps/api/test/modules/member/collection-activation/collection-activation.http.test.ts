import * as assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { test } from 'vitest';
import { ApiExceptionFilter } from '../../../../src/common/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../../../src/common/http/api-response.interceptor';
import { BizError } from '../../../../src/common/http/biz-error';
import { CollectionActivationController } from '../../../../src/modules/member/collection-activation/collection-activation.controller';
import { CollectionActivationService } from '../../../../src/modules/member/collection-activation/collection-activation.service';

test('POST /member-api/collection-activation returns wrapped activation result', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [CollectionActivationController],
    providers: [
      {
        provide: CollectionActivationService,
        useValue: {
          activateCollection: async () => ({
            collectionId: 'col_1',
            collectionNo: 'COL-20260514-AAAAA',
            status: 'OWNED',
            claimedAt: new Date('2026-05-14T08:00:00.000Z').getTime(),
            currentVersionId: 'ccv_1',
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
      .post('/member-api/collection-activation')
      .set('authorization', 'Bearer member.jwt.token')
      .send({
        activationCode: 'ABCD-EFGH-IJKL',
      })
      .expect(201);

    assert.deepEqual(response.body, {
      code: 'OK',
      message: 'success',
      data: {
        collectionId: 'col_1',
        collectionNo: 'COL-20260514-AAAAA',
        status: 'OWNED',
        claimedAt: new Date('2026-05-14T08:00:00.000Z').getTime(),
        currentVersionId: 'ccv_1',
      },
    });
  } finally {
    await app.close();
  }
});

test('POST /member-api/collection-activation returns wrapped auth error response', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [CollectionActivationController],
    providers: [
      {
        provide: CollectionActivationService,
        useValue: {
          activateCollection: async () => {
            throw new BizError({
              code: 'UNAUTHORIZED',
              message: 'member auth required',
              status: 401,
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
      .post('/member-api/collection-activation')
      .send({
        activationCode: 'ABCD-EFGH-IJKL',
      })
      .expect(401);

    assert.deepEqual(response.body, {
      code: 'UNAUTHORIZED',
      message: 'member auth required',
    });
  } finally {
    await app.close();
  }
});
