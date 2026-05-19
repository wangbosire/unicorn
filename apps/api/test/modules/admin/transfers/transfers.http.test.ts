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
  mock: Pick<TransfersService, 'listTransferOrders'> &
    Partial<
      Pick<
        TransfersService,
        | 'getTransferOperationsOverview'
        | 'listTransferOperationRecords'
        | 'expireTransferOrder'
        | 'completeTransferOrder'
        | 'rollbackTransferOrder'
        | 'syncTransferOrderOwner'
        | 'getTransferOrderHistory'
      >
    >,
): Promise<INestApplication> {
  const {
    getTransferOperationsOverview = async () => ({
      totalOperationRecords: 0,
      expiredOperations: 0,
      forceCompletedOperations: 0,
      forceRolledBackOperations: 0,
      syncedOwnerOperations: 0,
      expiredPendingReleaseAnomalies: 0,
      pendingAcceptOwnerAlreadyTransferredAnomalies: 0,
      completedOwnerMismatchAnomalies: 0,
      latestOperationAt: null,
      generatedAt: 1_716_271_200_000,
    }),
    listTransferOperationRecords = async () => ({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
    }),
    ...restMock
  } = mock;

  const moduleRef = await Test.createTestingModule({
    controllers: [TransfersController],
    providers: [
      {
        provide: TransfersService,
        useValue: {
          getTransferOperationsOverview,
          listTransferOperationRecords,
          expireTransferOrder: async () => {
            throw new Error('not used');
          },
          completeTransferOrder: async () => {
            throw new Error('not used');
          },
          rollbackTransferOrder: async () => {
            throw new Error('not used');
          },
          getTransferOrderHistory: async () => {
            throw new Error('not used');
          },
          syncTransferOrderOwner: async () => {
            throw new Error('not used');
          },
          ...restMock,
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
  return app;
}

test('GET /admin-api/transfers returns wrapped transfer list', async () => {
  const app = await createTransfersHttpApp({
    listTransferOrders: async (query) => {
      assert.equal(query.anomalyCode, 'EXPIRED_PENDING_RELEASE');
      return {
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
            anomalyCode: 'EXPIRED_PENDING_RELEASE',
            anomalyLabel: '超时未释放',
            expiredAt: 1_716_271_200_000,
            completedAt: null,
            createdAt: 1_716_012_800_000,
          },
        ],
        page: 1,
        pageSize: 20,
        total: 1,
      };
    },
    listTransferOperationRecords: async () => ({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
    }),
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/transfers')
      .query({ status: 'PENDING_ACCEPT', anomalyCode: 'EXPIRED_PENDING_RELEASE' })
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.total, 1);
    assert.equal(response.body.data.items[0]?.transferNo, 'TR-0001');
    assert.equal(response.body.data.items[0]?.status, 'PENDING_ACCEPT');
    assert.equal(response.body.data.items[0]?.anomalyCode, 'EXPIRED_PENDING_RELEASE');
  } finally {
    await app.close();
  }
});

test('GET /admin-api/transfers/operations/overview returns wrapped overview', async () => {
  const app = await createTransfersHttpApp({
    listTransferOrders: async () => ({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    }),
    getTransferOperationsOverview: async () => ({
      totalOperationRecords: 12,
      expiredOperations: 4,
      forceCompletedOperations: 3,
      forceRolledBackOperations: 2,
      syncedOwnerOperations: 3,
      expiredPendingReleaseAnomalies: 5,
      pendingAcceptOwnerAlreadyTransferredAnomalies: 2,
      completedOwnerMismatchAnomalies: 1,
      latestOperationAt: 1_716_271_200_000,
      generatedAt: 1_716_271_260_000,
    }),
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/transfers/operations/overview')
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.totalOperationRecords, 12);
    assert.equal(response.body.data.expiredOperations, 4);
    assert.equal(response.body.data.forceCompletedOperations, 3);
    assert.equal(response.body.data.expiredPendingReleaseAnomalies, 5);
  } finally {
    await app.close();
  }
});

test('GET /admin-api/transfers/operations returns wrapped operation list', async () => {
  const app = await createTransfersHttpApp({
    listTransferOrders: async () => ({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    }),
    listTransferOperationRecords: async (query) => {
      assert.equal(query.actionType, 'ADMIN_FORCE_COMPLETE');
      assert.equal(query.transferNo, 'TR-0003');
      assert.equal(query.operatorAdminAccountNo, 'ADM000001');
      return {
        items: [
          {
            operationRecordId: 'op_1',
            transferId: 'transfer_3',
            transferNo: 'TR-0003',
            collectionId: 'collection_3',
            collectionNo: 'COL-0003',
            actionType: 'ADMIN_FORCE_COMPLETE',
            actionLabel: '强制完成',
            reason: '链路补偿已到账但状态未完成',
            operatorAdminUserId: 'admin_1',
            operatorAdminAccountNo: 'ADM000001',
            operatorAdminDisplayName: '系统管理员',
            beforeStatus: 'PENDING_ACCEPT',
            afterStatus: 'COMPLETED',
            beforeCurrentOwnerMemberId: 'member_from_1',
            afterCurrentOwnerMemberId: 'member_to_1',
            createdAt: 1_716_271_200_000,
          },
        ],
        page: 1,
        pageSize: 10,
        total: 1,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/transfers/operations')
      .query({
        actionType: 'ADMIN_FORCE_COMPLETE',
        transferNo: 'TR-0003',
        operatorAdminAccountNo: 'ADM000001',
      })
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.total, 1);
    assert.equal(response.body.data.items[0]?.transferNo, 'TR-0003');
    assert.equal(response.body.data.items[0]?.actionType, 'ADMIN_FORCE_COMPLETE');
  } finally {
    await app.close();
  }
});

test('POST /admin-api/transfers/:transferId/expire returns wrapped payload', async () => {
  const app = await createTransfersHttpApp({
    listTransferOrders: async () => ({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    }),
    expireTransferOrder: async (transferId, body, operatorAdminUserId) => {
      assert.equal(transferId, 'transfer_1');
      assert.equal(body.reason, '客服人工释放');
      assert.equal(operatorAdminUserId, null);
      return {
        transferId,
        transferNo: 'TR-0001',
        status: 'EXPIRED',
        handledAt: 1_716_271_200_000,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .post('/admin-api/transfers/transfer_1/expire')
      .send({ reason: '客服人工释放' })
      .expect(201);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.transferId, 'transfer_1');
    assert.equal(response.body.data.status, 'EXPIRED');
  } finally {
    await app.close();
  }
});

test('POST /admin-api/transfers/:transferId/complete returns wrapped payload', async () => {
  const app = await createTransfersHttpApp({
    listTransferOrders: async () => ({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    }),
    completeTransferOrder: async (transferId, body, operatorAdminUserId) => {
      assert.equal(transferId, 'transfer_3');
      assert.equal(body.reason, '链路补偿已到账但状态未完成');
      assert.equal(operatorAdminUserId, null);
      return {
        transferId,
        transferNo: 'TR-0003',
        status: 'COMPLETED',
        currentOwnerMemberId: 'member_to_1',
        handledAt: 1_716_271_200_000,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .post('/admin-api/transfers/transfer_3/complete')
      .send({ reason: '链路补偿已到账但状态未完成' })
      .expect(201);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.transferId, 'transfer_3');
    assert.equal(response.body.data.status, 'COMPLETED');
    assert.equal(response.body.data.currentOwnerMemberId, 'member_to_1');
  } finally {
    await app.close();
  }
});

test('POST /admin-api/transfers/:transferId/rollback returns wrapped payload', async () => {
  const app = await createTransfersHttpApp({
    listTransferOrders: async () => ({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    }),
    rollbackTransferOrder: async (transferId, body, operatorAdminUserId) => {
      assert.equal(transferId, 'transfer_4');
      assert.equal(body.reason, '客诉判定需撤销已完成转让');
      assert.equal(operatorAdminUserId, null);
      return {
        transferId,
        transferNo: 'TR-0004',
        status: 'ROLLED_BACK',
        currentOwnerMemberId: 'member_from_1',
        handledAt: 1_716_271_200_000,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .post('/admin-api/transfers/transfer_4/rollback')
      .send({ reason: '客诉判定需撤销已完成转让' })
      .expect(201);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.transferId, 'transfer_4');
    assert.equal(response.body.data.status, 'ROLLED_BACK');
    assert.equal(response.body.data.currentOwnerMemberId, 'member_from_1');
  } finally {
    await app.close();
  }
});

test('GET /admin-api/transfers/:transferId/history returns wrapped timeline', async () => {
  const app = await createTransfersHttpApp({
    listTransferOrders: async () => ({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    }),
    getTransferOrderHistory: async (transferId) => {
      assert.equal(transferId, 'transfer_1');
      return {
        transferId,
        transferNo: 'TR-0001',
        totalRecords: 1,
        items: [
          {
            operationRecordId: 'op_1',
            actionType: 'ADMIN_EXPIRE',
            actionLabel: '释放超时单',
            reason: '客服人工释放',
            operatorAdminUserId: 'admin_1',
            operatorAdminAccountNo: 'ADM000001',
            operatorAdminDisplayName: '系统管理员',
            beforeStatus: 'PENDING_ACCEPT',
            afterStatus: 'EXPIRED',
            beforeCurrentOwnerMemberId: 'member_from_1',
            afterCurrentOwnerMemberId: 'member_from_1',
            createdAt: 1_716_271_200_000,
          },
        ],
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .get('/admin-api/transfers/transfer_1/history')
      .expect(200);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.transferId, 'transfer_1');
    assert.equal(response.body.data.totalRecords, 1);
    assert.equal(response.body.data.items[0]?.actionType, 'ADMIN_EXPIRE');
  } finally {
    await app.close();
  }
});

test('POST /admin-api/transfers/:transferId/sync-owner returns wrapped payload', async () => {
  const app = await createTransfersHttpApp({
    listTransferOrders: async () => ({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    }),
    syncTransferOrderOwner: async (transferId, body, operatorAdminUserId) => {
      assert.equal(transferId, 'transfer_2');
      assert.equal(body.reason, '历史补偿漏写 owner');
      assert.equal(operatorAdminUserId, null);
      return {
        transferId,
        transferNo: 'TR-0002',
        collectionId: 'collection_2',
        currentOwnerMemberId: 'member_to_2',
        handledAt: 1_716_271_200_000,
      };
    },
  });

  try {
    const response = await request(app.getHttpServer())
      .post('/admin-api/transfers/transfer_2/sync-owner')
      .send({ reason: '历史补偿漏写 owner' })
      .expect(201);

    assert.equal(response.body.code, 'OK');
    assert.equal(response.body.data.transferId, 'transfer_2');
    assert.equal(response.body.data.currentOwnerMemberId, 'member_to_2');
  } finally {
    await app.close();
  }
});
