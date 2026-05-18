import * as assert from 'node:assert/strict';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { test } from 'vitest';
import { ApiExceptionFilter } from '../../../../src/common/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../../../src/common/http/api-response.interceptor';
import { AdminAccessGuard } from '../../../../src/modules/admin/auth/admin-access.guard';
import { TransfersController } from '../../../../src/modules/admin/transfers/transfers.controller';
import { TransfersService } from '../../../../src/modules/admin/transfers/transfers.service';

async function createTransfersHttpApp(
  mock: Pick<TransfersService, 'listTransferOrders'>,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [TransfersController],
    providers: [
      {
        provide: TransfersService,
        useValue: mock,
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

test('GET /admin-api/transfers returns wrapped transfer list', async () => {
  const app = await createTransfersHttpApp({
    listTransferOrders: async () => ({
      items: [
        {
          transferId: 'transfer_1',
          transferNo: 'TR-0001',
          collectionId: 'collection_1',
          collectionNo: 'COL-0001',
          seriesNo: 'SER-0001',
          seriesName: '测试系列',
          batchNo: 'BAT-0001',
          batchName: '测试批次',
          fromMemberId: 'member_from_1',
          fromMemberNo: 'MEM-0001',
          fromMemberNickname: '转出会员',
          toMemberId: 'member_to_1',
          toMemberNo: 'MEM-0002',
          toMemberNickname: '转入会员',
          transferMode: 'DIRECT_MEMBER',
          transferCode: null,
          status: 'PENDING_ACCEPT',
          expiredAt: 1_716_271_200_000,
          completedAt: null,
          createdAt: 1_716_012_800_000,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    }),
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/transfers')
      .query({ status: 'PENDING_ACCEPT' })
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.total, 1);
    assert.equal(response.body.data.items[0]?.transferNo, 'TR-0001');
    assert.equal(response.body.data.items[0]?.status, 'PENDING_ACCEPT');
  } finally {
    await app.close();
  }
});
