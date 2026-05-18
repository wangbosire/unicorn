import * as assert from 'node:assert/strict';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { test } from 'vitest';
import { ApiExceptionFilter } from '../../../../src/common/http/api-exception.filter';
import { ApiResponseInterceptor } from '../../../../src/common/http/api-response.interceptor';
import { MemberTransfersController } from '../../../../src/modules/member/transfers/member-transfers.controller';
import { MemberTransfersService } from '../../../../src/modules/member/transfers/member-transfers.service';

async function createMemberTransfersHttpApp(
  mock: Pick<
    MemberTransfersService,
    'listMemberTransfers' | 'createMemberTransfer' | 'acceptMemberTransfer' | 'acceptMemberTransferByCode'
  >,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [MemberTransfersController],
    providers: [
      {
        provide: MemberTransfersService,
        useValue: mock,
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.init();
  return app;
}

test('GET /member-api/my/transfers returns wrapped payload', async () => {
  const app = await createMemberTransfersHttpApp({
    listMemberTransfers: async () => ({
      items: [
        {
          transferId: 'transfer_1',
          transferNo: 'TR-000001',
          collectionId: 'col_1',
          collectionNo: 'COL-0001',
          direction: 'outgoing',
          transferMode: 'DIRECT_MEMBER',
          status: 'PENDING_ACCEPT',
          transferCode: null,
          counterpartMemberNo: 'MEM-0002',
          counterpartNickname: '目标会员',
          expiredAt: 1_716_278_400_000,
          completedAt: null,
          createdAt: 1_716_019_200_000,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    }),
    createMemberTransfer: async () => ({
      transferId: 'transfer_1',
      transferNo: 'TR-000001',
      collectionId: 'col_1',
      collectionNo: 'COL-0001',
      transferMode: 'DIRECT_MEMBER',
      status: 'PENDING_ACCEPT',
      transferCode: null,
      toMemberNo: 'MEM-0002',
      toMemberNickname: '目标会员',
      expiredAt: 1_716_278_400_000,
      createdAt: 1_716_019_200_000,
    }),
    acceptMemberTransfer: async () => ({
      transferId: 'transfer_1',
      transferNo: 'TR-000001',
      collectionId: 'col_1',
      collectionNo: 'COL-0001',
      status: 'COMPLETED',
      currentOwnerMemberId: 'mem_2',
      currentOwnerMemberNo: 'MEM-0002',
      currentOwnerNickname: '目标会员',
      completedAt: 1_716_022_800_000,
    }),
    acceptMemberTransferByCode: async () => ({
      transferId: 'transfer_2',
      transferNo: 'TR-000002',
      collectionId: 'col_2',
      collectionNo: 'COL-0002',
      status: 'COMPLETED',
      currentOwnerMemberId: 'mem_3',
      currentOwnerMemberNo: 'MEM-0003',
      currentOwnerNickname: '新持有人',
      completedAt: 1_716_026_400_000,
    }),
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/member-api/my/transfers')
      .set('authorization', 'Bearer member.jwt.token')
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.items[0]?.transferNo, 'TR-000001');
  } finally {
    await app.close();
  }
});

test('POST /member-api/my/collections/:collectionId/transfers returns wrapped payload', async () => {
  const app = await createMemberTransfersHttpApp({
    listMemberTransfers: async () => ({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    }),
    createMemberTransfer: async () => ({
      transferId: 'transfer_1',
      transferNo: 'TR-000001',
      collectionId: 'col_1',
      collectionNo: 'COL-0001',
      transferMode: 'DIRECT_MEMBER',
      status: 'PENDING_ACCEPT',
      transferCode: null,
      toMemberNo: 'MEM-0002',
      toMemberNickname: '目标会员',
      expiredAt: 1_716_278_400_000,
      createdAt: 1_716_019_200_000,
    }),
    acceptMemberTransfer: async () => ({
      transferId: 'transfer_1',
      transferNo: 'TR-000001',
      collectionId: 'col_1',
      collectionNo: 'COL-0001',
      status: 'COMPLETED',
      currentOwnerMemberId: 'mem_2',
      currentOwnerMemberNo: 'MEM-0002',
      currentOwnerNickname: '目标会员',
      completedAt: 1_716_022_800_000,
    }),
    acceptMemberTransferByCode: async () => ({
      transferId: 'transfer_2',
      transferNo: 'TR-000002',
      collectionId: 'col_2',
      collectionNo: 'COL-0002',
      status: 'COMPLETED',
      currentOwnerMemberId: 'mem_3',
      currentOwnerMemberNo: 'MEM-0003',
      currentOwnerNickname: '新持有人',
      completedAt: 1_716_026_400_000,
    }),
  });

  try {
    const response = await request(app.getHttpServer())
      .post('/member-api/my/collections/col_1/transfers')
      .set('authorization', 'Bearer member.jwt.token')
      .send({
        transferMode: 'DIRECT_MEMBER',
        toMemberNo: 'MEM-0002',
      })
      .expect(201);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.transferNo, 'TR-000001');
  } finally {
    await app.close();
  }
});

test('POST /member-api/my/transfers/accept-by-code returns wrapped payload', async () => {
  const app = await createMemberTransfersHttpApp({
    listMemberTransfers: async () => ({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    }),
    createMemberTransfer: async () => ({
      transferId: 'transfer_1',
      transferNo: 'TR-000001',
      collectionId: 'col_1',
      collectionNo: 'COL-0001',
      transferMode: 'DIRECT_MEMBER',
      status: 'PENDING_ACCEPT',
      transferCode: null,
      toMemberNo: 'MEM-0002',
      toMemberNickname: '目标会员',
      expiredAt: 1_716_278_400_000,
      createdAt: 1_716_019_200_000,
    }),
    acceptMemberTransfer: async () => ({
      transferId: 'transfer_1',
      transferNo: 'TR-000001',
      collectionId: 'col_1',
      collectionNo: 'COL-0001',
      status: 'COMPLETED',
      currentOwnerMemberId: 'mem_2',
      currentOwnerMemberNo: 'MEM-0002',
      currentOwnerNickname: '目标会员',
      completedAt: 1_716_022_800_000,
    }),
    acceptMemberTransferByCode: async () => ({
      transferId: 'transfer_2',
      transferNo: 'TR-000002',
      collectionId: 'col_2',
      collectionNo: 'COL-0002',
      status: 'COMPLETED',
      currentOwnerMemberId: 'mem_3',
      currentOwnerMemberNo: 'MEM-0003',
      currentOwnerNickname: '新持有人',
      completedAt: 1_716_026_400_000,
    }),
  });

  try {
    const response = await request(app.getHttpServer())
      .post('/member-api/my/transfers/accept-by-code')
      .set('authorization', 'Bearer member.jwt.token')
      .send({
        transferCode: 'XFER-DEMO',
      })
      .expect(201);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.transferNo, 'TR-000002');
  } finally {
    await app.close();
  }
});
