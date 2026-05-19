import * as assert from 'node:assert/strict';
import {
  CollectionTransferMode,
  CollectionTransferStatus,
  NotificationMessageType,
} from '@prisma/client';
import { test } from 'vitest';
import { BizError } from '../../../../src/common/http/biz-error';
import { TransfersService } from '../../../../src/modules/admin/transfers/transfers.service';

test('TransfersService.listTransferOrders returns paginated transfer rows', async () => {
  const rows = [
    {
      id: 'transfer_1',
      transferNo: 'TR-0001',
      collectionId: 'collection_1',
      fromMemberId: 'member_from_1',
      toMemberId: 'member_to_1',
      transferMode: CollectionTransferMode.DIRECT_MEMBER,
      transferCode: null,
      status: CollectionTransferStatus.PENDING_ACCEPT,
      expiredAt: new Date('2026-05-24T08:00:00.000Z'),
      completedAt: null,
      createdAt: new Date('2026-05-18T08:00:00.000Z'),
      updatedAt: new Date('2026-05-18T08:00:00.000Z'),
      collection: {
        id: 'collection_1',
        collectionNo: 'COL-0001',
        currentOwnerMemberId: 'member_from_1',
        series: {
          seriesNo: 'SER-0001',
          name: '测试系列',
        },
        batch: {
          batchNo: 'BAT-0001',
          name: '测试批次',
        },
      },
      fromMember: {
        id: 'member_from_1',
        memberNo: 'MEM-0001',
        nickname: '转出会员',
      },
      toMember: {
        id: 'member_to_1',
        memberNo: 'MEM-0002',
        nickname: '转入会员',
      },
    },
    {
      id: 'transfer_2',
      transferNo: 'TR-0002',
      collectionId: 'collection_2',
      fromMemberId: 'member_from_1',
      toMemberId: null,
      transferMode: CollectionTransferMode.TRANSFER_CODE,
      transferCode: 'XFER-2026',
      status: CollectionTransferStatus.EXPIRED,
      expiredAt: new Date('2026-05-18T12:00:00.000Z'),
      completedAt: null,
      createdAt: new Date('2026-05-18T07:00:00.000Z'),
      updatedAt: new Date('2026-05-18T07:00:00.000Z'),
      collection: {
        id: 'collection_2',
        collectionNo: 'COL-0002',
        currentOwnerMemberId: 'member_from_1',
        series: {
          seriesNo: 'SER-0001',
          name: '测试系列',
        },
        batch: {
          batchNo: 'BAT-0001',
          name: '测试批次',
        },
      },
      fromMember: {
        id: 'member_from_1',
        memberNo: 'MEM-0001',
        nickname: '转出会员',
      },
      toMember: null,
    },
  ];

  const prisma = {
    collectionTransferOrder: {
      findMany: async () => rows,
      count: async () => 2,
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };

  const service = new TransfersService(
    prisma as never,
    { dispatch: async () => ({}) } as never,
  );
  const result = await service.listTransferOrders({
    page: '1',
    pageSize: '20',
    status: 'PENDING_ACCEPT',
  });

  assert.equal(result.total, 2);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0]?.transferNo, 'TR-0001');
  assert.equal(result.items[0]?.fromMemberNo, 'MEM-0001');
  assert.equal(result.items[0]?.anomalyCode, null);
  assert.equal(result.items[1]?.transferCode, 'XFER-2026');
  assert.equal(result.items[1]?.toMemberNo, null);
  assert.equal(result.items[1]?.anomalyCode, null);
});

test('TransfersService.listTransferOrders filters by anomaly code', async () => {
  const rows = [
    {
      id: 'transfer_1',
      transferNo: 'TR-0001',
      collectionId: 'collection_1',
      fromMemberId: 'member_from_1',
      toMemberId: 'member_to_1',
      transferMode: CollectionTransferMode.DIRECT_MEMBER,
      transferCode: null,
      status: CollectionTransferStatus.PENDING_ACCEPT,
      expiredAt: new Date('2000-05-18T08:00:00.000Z'),
      completedAt: null,
      createdAt: new Date('2026-05-18T07:00:00.000Z'),
      updatedAt: new Date('2026-05-18T07:00:00.000Z'),
      collection: {
        id: 'collection_1',
        collectionNo: 'COL-0001',
        currentOwnerMemberId: 'member_from_1',
        series: { seriesNo: 'SER-0001', name: '测试系列' },
        batch: { batchNo: 'BAT-0001', name: '测试批次' },
      },
      fromMember: { id: 'member_from_1', memberNo: 'MEM-0001', nickname: '转出会员' },
      toMember: { id: 'member_to_1', memberNo: 'MEM-0002', nickname: '转入会员' },
    },
    {
      id: 'transfer_2',
      transferNo: 'TR-0002',
      collectionId: 'collection_2',
      fromMemberId: 'member_from_1',
      toMemberId: 'member_to_2',
      transferMode: CollectionTransferMode.DIRECT_MEMBER,
      transferCode: null,
      status: CollectionTransferStatus.COMPLETED,
      expiredAt: new Date('2026-05-18T08:00:00.000Z'),
      completedAt: new Date('2000-05-18T10:00:00.000Z'),
      createdAt: new Date('2000-05-18T07:00:00.000Z'),
      updatedAt: new Date('2000-05-18T10:00:00.000Z'),
      collection: {
        id: 'collection_2',
        collectionNo: 'COL-0002',
        currentOwnerMemberId: 'member_from_1',
        series: { seriesNo: 'SER-0001', name: '测试系列' },
        batch: { batchNo: 'BAT-0001', name: '测试批次' },
      },
      fromMember: { id: 'member_from_1', memberNo: 'MEM-0001', nickname: '转出会员' },
      toMember: { id: 'member_to_2', memberNo: 'MEM-0003', nickname: '转入会员' },
    },
  ];

  const prisma = {
    collectionTransferOrder: {
      findMany: async () => rows,
    },
  };

  const service = new TransfersService(
    prisma as never,
    { dispatch: async () => ({}) } as never,
  );
  const result = await service.listTransferOrders({
    page: '1',
    pageSize: '20',
    anomalyCode: 'EXPIRED_PENDING_RELEASE',
  });

  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.transferNo, 'TR-0001');
  assert.equal(result.items[0]?.anomalyCode, 'EXPIRED_PENDING_RELEASE');
});

test('TransfersService.listTransferOperationRecords returns paginated operation rows', async () => {
  let receivedWhere: unknown;
  const prisma = {
    collectionTransferOperationRecord: {
      findMany: async (args: { where: unknown }) => {
        receivedWhere = args.where;
        return [
          {
            id: 'op_1',
            actionType: 'ADMIN_FORCE_COMPLETE',
            reason: '链路补偿已到账但状态未完成',
            beforeSnapshot: {
              status: 'PENDING_ACCEPT',
              currentOwnerMemberId: 'member_from_1',
            },
            afterSnapshot: {
              status: 'COMPLETED',
              currentOwnerMemberId: 'member_to_1',
            },
            createdAt: new Date('2026-05-18T10:35:00.000Z'),
            transfer: {
              id: 'transfer_3',
              transferNo: 'TR-0003',
              collection: {
                id: 'collection_3',
                collectionNo: 'COL-0003',
              },
            },
            operatorAdminUser: {
              id: 'admin_1',
              accountNo: 'ADM000001',
              displayName: '系统管理员',
            },
          },
        ];
      },
      count: async () => 1,
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };

  const service = new TransfersService(
    prisma as never,
    { dispatch: async () => ({}) } as never,
  );
  const result = await service.listTransferOperationRecords({
    page: '1',
    pageSize: '10',
    transferNo: 'TR-0003',
    operatorAdminAccountNo: 'ADM000001',
    actionType: 'ADMIN_FORCE_COMPLETE',
  });

  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.transferNo, 'TR-0003');
  assert.equal(result.items[0]?.actionType, 'ADMIN_FORCE_COMPLETE');
  assert.equal(result.items[0]?.afterStatus, 'COMPLETED');
  assert.deepEqual(receivedWhere, {
    actionType: 'ADMIN_FORCE_COMPLETE',
    operatorAdminUser: {
      accountNo: 'ADM000001',
    },
    transfer: {
      transferNo: 'TR-0003',
    },
  });
});

test('TransfersService.getTransferOperationsOverview returns grouped counters', async () => {
  let anomalyQueryIndex = 0;
  const prisma = {
    collectionTransferOperationRecord: {
      groupBy: async () => [
        {
          actionType: 'ADMIN_EXPIRE',
          _count: { _all: 4 },
        },
        {
          actionType: 'ADMIN_FORCE_COMPLETE',
          _count: { _all: 3 },
        },
        {
          actionType: 'ADMIN_FORCE_ROLLBACK',
          _count: { _all: 2 },
        },
        {
          actionType: 'ADMIN_SYNC_OWNER',
          _count: { _all: 5 },
        },
      ],
      findFirst: async () => ({
        createdAt: new Date('2026-05-19T07:35:00.000Z'),
      }),
    },
    collectionTransferOrder: {
      findMany: async () => {
        anomalyQueryIndex += 1;

        if (anomalyQueryIndex === 1) {
          return [
            {
              status: CollectionTransferStatus.PENDING_ACCEPT,
              expiredAt: new Date('2026-05-18T07:35:00.000Z'),
              completedAt: null,
              toMemberId: 'member_to_1',
              collection: {
                currentOwnerMemberId: 'member_from_1',
              },
            },
            {
              status: CollectionTransferStatus.PENDING_ACCEPT,
              expiredAt: new Date('2026-05-18T08:35:00.000Z'),
              completedAt: null,
              toMemberId: 'member_to_2',
              collection: {
                currentOwnerMemberId: 'member_from_2',
              },
            },
          ];
        }

        if (anomalyQueryIndex === 2) {
          return [
            {
              status: CollectionTransferStatus.PENDING_ACCEPT,
              expiredAt: null,
              completedAt: null,
              toMemberId: 'member_to_1',
              collection: {
                currentOwnerMemberId: 'member_to_1',
              },
            },
            {
              status: CollectionTransferStatus.PENDING_ACCEPT,
              expiredAt: null,
              completedAt: null,
              toMemberId: 'member_to_2',
              collection: {
                currentOwnerMemberId: 'member_from_2',
              },
            },
          ];
        }

        return [
          {
            status: CollectionTransferStatus.COMPLETED,
            expiredAt: null,
            completedAt: new Date('2026-05-19T06:35:00.000Z'),
            toMemberId: 'member_to_1',
            collection: {
              currentOwnerMemberId: 'member_from_1',
            },
          },
          {
            status: CollectionTransferStatus.COMPLETED,
            expiredAt: null,
            completedAt: new Date('2026-05-19T05:35:00.000Z'),
            toMemberId: 'member_to_2',
            collection: {
              currentOwnerMemberId: 'member_to_2',
            },
          },
        ];
      },
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };

  const service = new TransfersService(
    prisma as never,
    { dispatch: async () => ({}) } as never,
  );
  const result = await service.getTransferOperationsOverview();

  assert.equal(result.totalOperationRecords, 14);
  assert.equal(result.expiredOperations, 4);
  assert.equal(result.forceCompletedOperations, 3);
  assert.equal(result.forceRolledBackOperations, 2);
  assert.equal(result.syncedOwnerOperations, 5);
  assert.equal(result.expiredPendingReleaseAnomalies, 2);
  assert.equal(result.pendingAcceptOwnerAlreadyTransferredAnomalies, 1);
  assert.equal(result.completedOwnerMismatchAnomalies, 1);
  assert.equal(result.latestOperationAt, new Date('2026-05-19T07:35:00.000Z').getTime());
});

test('TransfersService.expireTransferOrder releases overdue pending transfer', async () => {
  const dispatched: unknown[] = [];
  const operationRecords: unknown[] = [];
  const prisma = {
    collectionTransferOrder: {
      findUnique: async () => ({
        id: 'transfer_1',
        transferNo: 'TR-0001',
        fromMemberId: 'member_from_1',
        toMemberId: 'member_to_1',
        status: CollectionTransferStatus.PENDING_ACCEPT,
        expiredAt: new Date('2000-05-18T08:00:00.000Z'),
        completedAt: null,
        collection: {
          id: 'collection_1',
          collectionNo: 'COL-0001',
          currentOwnerMemberId: 'member_from_1',
        },
      }),
      update: async () => ({
        id: 'transfer_1',
        transferNo: 'TR-0001',
        fromMemberId: 'member_from_1',
      }),
    },
    collectionTransferOperationRecord: {
      create: async (args: unknown) => {
        operationRecords.push(args);
        return {};
      },
    },
    $transaction: async (input: unknown) => {
      if (typeof input === 'function') {
        return input({
          collectionTransferOrder: prisma.collectionTransferOrder,
          collectionTransferOperationRecord: prisma.collectionTransferOperationRecord,
        });
      }
      return Promise.all(input as Promise<unknown>[]);
    },
  };

  const service = new TransfersService(
    prisma as never,
    {
      dispatch: async (payload: unknown) => {
        dispatched.push(payload);
        return {};
      },
    } as never,
  );

  const result = await service.expireTransferOrder(
    'transfer_1',
    { reason: '客服人工释放超时单' },
    'admin_1',
  );

  assert.equal(result.transferId, 'transfer_1');
  assert.equal(result.status, 'EXPIRED');
  assert.equal(dispatched.length, 1);
  assert.equal(operationRecords.length, 1);
  assert.deepEqual(dispatched[0], {
    memberId: 'member_from_1',
    messageType: NotificationMessageType.TRANSFER_EXPIRED,
    payload: { collectionName: 'COL-0001' },
  });
});

test('TransfersService.expireTransferOrder rejects non-overdue transfer', async () => {
  const prisma = {
    collectionTransferOrder: {
      findUnique: async () => ({
        id: 'transfer_1',
        transferNo: 'TR-0001',
        fromMemberId: 'member_from_1',
        toMemberId: 'member_to_1',
        status: CollectionTransferStatus.PENDING_ACCEPT,
        expiredAt: new Date('2999-05-20T08:00:00.000Z'),
        completedAt: null,
        collection: {
          collectionNo: 'COL-0001',
        },
      }),
    },
  };

  const service = new TransfersService(
    prisma as never,
    { dispatch: async () => ({}) } as never,
  );

  await assert.rejects(
    () =>
      service.expireTransferOrder(
        'transfer_1',
        { reason: '客服人工释放超时单' },
        'admin_1',
      ),
    (error: unknown) => {
      assert.ok(error instanceof BizError);
      assert.equal(error.code, 'TRANSFER_EXPIRE_NOT_ALLOWED');
      return true;
    },
  );
});

test('TransfersService.completeTransferOrder force completes owner-already-transferred pending order', async () => {
  const dispatched: unknown[] = [];
  const operationRecords: unknown[] = [];
  const prisma = {
    collectionTransferOrder: {
      findUnique: async () => ({
        id: 'transfer_3',
        transferNo: 'TR-0003',
        fromMemberId: 'member_from_1',
        toMemberId: 'member_to_1',
        status: CollectionTransferStatus.PENDING_ACCEPT,
        expiredAt: new Date('2999-05-18T08:00:00.000Z'),
        completedAt: null,
        collection: {
          id: 'collection_3',
          collectionNo: 'COL-0003',
          currentOwnerMemberId: 'member_to_1',
        },
      }),
      update: async () => ({
        id: 'transfer_3',
        transferNo: 'TR-0003',
        fromMemberId: 'member_from_1',
        toMemberId: 'member_to_1',
      }),
    },
    collectionTransferOperationRecord: {
      create: async (args: unknown) => {
        operationRecords.push(args);
        return {};
      },
    },
    $transaction: async (input: unknown) => {
      if (typeof input === 'function') {
        return input({
          collectionTransferOrder: prisma.collectionTransferOrder,
          collectionTransferOperationRecord: prisma.collectionTransferOperationRecord,
        });
      }
      return Promise.all(input as Promise<unknown>[]);
    },
  };

  const service = new TransfersService(
    prisma as never,
    {
      dispatch: async (payload: unknown) => {
        dispatched.push(payload);
        return {};
      },
    } as never,
  );

  const result = await service.completeTransferOrder(
    'transfer_3',
    { reason: '链路补偿已到账但状态未完成，后台补记完成' },
    'admin_1',
  );

  assert.equal(result.transferId, 'transfer_3');
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.currentOwnerMemberId, 'member_to_1');
  assert.equal(operationRecords.length, 1);
  assert.equal(dispatched.length, 1);
  assert.deepEqual(dispatched[0], {
    memberId: 'member_from_1',
    messageType: NotificationMessageType.TRANSFER_COMPLETED,
    payload: { collectionName: 'COL-0003' },
  });
});

test('TransfersService.completeTransferOrder rejects healthy pending transfer', async () => {
  const prisma = {
    collectionTransferOrder: {
      findUnique: async () => ({
        id: 'transfer_3',
        transferNo: 'TR-0003',
        fromMemberId: 'member_from_1',
        toMemberId: 'member_to_1',
        status: CollectionTransferStatus.PENDING_ACCEPT,
        expiredAt: new Date('2999-05-18T08:00:00.000Z'),
        completedAt: null,
        collection: {
          id: 'collection_3',
          collectionNo: 'COL-0003',
          currentOwnerMemberId: 'member_from_1',
        },
      }),
    },
  };

  const service = new TransfersService(
    prisma as never,
    { dispatch: async () => ({}) } as never,
  );

  await assert.rejects(
    () =>
      service.completeTransferOrder(
        'transfer_3',
        { reason: '链路补偿已到账但状态未完成，后台补记完成' },
        'admin_1',
      ),
    (error: unknown) => {
      assert.ok(error instanceof BizError);
      assert.equal(error.code, 'TRANSFER_COMPLETE_NOT_ALLOWED');
      return true;
    },
  );
});

test('TransfersService.rollbackTransferOrder rolls completed transfer back to initiator', async () => {
  const dispatched: unknown[] = [];
  const updatedCollections: unknown[] = [];
  const operationRecords: unknown[] = [];
  const prisma = {
    collectionTransferOrder: {
      findUnique: async () => ({
        id: 'transfer_4',
        transferNo: 'TR-0004',
        fromMemberId: 'member_from_1',
        toMemberId: 'member_to_1',
        status: CollectionTransferStatus.COMPLETED,
        expiredAt: new Date('2999-05-18T08:00:00.000Z'),
        completedAt: new Date('2026-05-18T10:00:00.000Z'),
        collection: {
          id: 'collection_4',
          collectionNo: 'COL-0004',
          currentOwnerMemberId: 'member_to_1',
        },
      }),
      update: async () => ({
        id: 'transfer_4',
        transferNo: 'TR-0004',
        fromMemberId: 'member_from_1',
        toMemberId: 'member_to_1',
      }),
    },
    collection: {
      update: async (args: unknown) => {
        updatedCollections.push(args);
        return {};
      },
    },
    collectionTransferOperationRecord: {
      create: async (args: unknown) => {
        operationRecords.push(args);
        return {};
      },
    },
    $transaction: async (input: unknown) => {
      if (typeof input === 'function') {
        return input({
          collectionTransferOrder: prisma.collectionTransferOrder,
          collection: prisma.collection,
          collectionTransferOperationRecord: prisma.collectionTransferOperationRecord,
        });
      }
      return Promise.all(input as Promise<unknown>[]);
    },
  };

  const service = new TransfersService(
    prisma as never,
    {
      dispatch: async (payload: unknown) => {
        dispatched.push(payload);
        return {};
      },
    } as never,
  );

  const result = await service.rollbackTransferOrder(
    'transfer_4',
    { reason: '客诉判定需撤销已完成转让' },
    'admin_1',
  );

  assert.equal(result.transferId, 'transfer_4');
  assert.equal(result.status, 'ROLLED_BACK');
  assert.equal(result.currentOwnerMemberId, 'member_from_1');
  assert.equal(operationRecords.length, 1);
  assert.equal(dispatched.length, 2);
  assert.deepEqual(updatedCollections[0], {
    where: { id: 'collection_4' },
    data: { currentOwnerMemberId: 'member_from_1' },
  });
});

test('TransfersService.rollbackTransferOrder rejects non-completed transfer', async () => {
  const prisma = {
    collectionTransferOrder: {
      findUnique: async () => ({
        id: 'transfer_4',
        transferNo: 'TR-0004',
        fromMemberId: 'member_from_1',
        toMemberId: 'member_to_1',
        status: CollectionTransferStatus.PENDING_ACCEPT,
        expiredAt: new Date('2999-05-18T08:00:00.000Z'),
        completedAt: null,
        collection: {
          id: 'collection_4',
          collectionNo: 'COL-0004',
          currentOwnerMemberId: 'member_from_1',
        },
      }),
    },
  };

  const service = new TransfersService(
    prisma as never,
    { dispatch: async () => ({}) } as never,
  );

  await assert.rejects(
    () =>
      service.rollbackTransferOrder(
        'transfer_4',
        { reason: '客诉判定需撤销已完成转让' },
        'admin_1',
      ),
    (error: unknown) => {
      assert.ok(error instanceof BizError);
      assert.equal(error.code, 'TRANSFER_ROLLBACK_NOT_ALLOWED');
      return true;
    },
  );
});

test('TransfersService.syncTransferOrderOwner repairs completed owner mismatch', async () => {
  const updatedCollections: unknown[] = [];
  const operationRecords: unknown[] = [];
  const prisma = {
    collectionTransferOrder: {
      findUnique: async () => ({
        id: 'transfer_2',
        transferNo: 'TR-0002',
        toMemberId: 'member_to_2',
        status: CollectionTransferStatus.COMPLETED,
        expiredAt: null,
        completedAt: new Date('2000-05-18T10:00:00.000Z'),
        collection: {
          id: 'collection_2',
          collectionNo: 'COL-0002',
          currentOwnerMemberId: 'member_from_1',
        },
      }),
    },
    collection: {
      update: async (args: unknown) => {
        updatedCollections.push(args);
        return {};
      },
    },
    collectionTransferOperationRecord: {
      create: async (args: unknown) => {
        operationRecords.push(args);
        return {};
      },
    },
    $transaction: async (input: unknown) => {
      if (typeof input === 'function') {
        return input({
          collection: prisma.collection,
          collectionTransferOperationRecord: prisma.collectionTransferOperationRecord,
        });
      }
      return Promise.all(input as Promise<unknown>[]);
    },
  };

  const service = new TransfersService(
    prisma as never,
    { dispatch: async () => ({}) } as never,
  );

  const result = await service.syncTransferOrderOwner(
    'transfer_2',
    { reason: '完成后 owner 未回写，人工修复' },
    'admin_1',
  );

  assert.equal(result.transferId, 'transfer_2');
  assert.equal(result.collectionId, 'collection_2');
  assert.equal(result.currentOwnerMemberId, 'member_to_2');
  assert.deepEqual(updatedCollections[0], {
    where: { id: 'collection_2' },
    data: { currentOwnerMemberId: 'member_to_2' },
  });
  assert.equal(operationRecords.length, 1);
});

test('TransfersService.syncTransferOrderOwner rejects healthy completed transfer', async () => {
  const prisma = {
    collectionTransferOrder: {
      findUnique: async () => ({
        id: 'transfer_2',
        transferNo: 'TR-0002',
        toMemberId: 'member_to_2',
        status: CollectionTransferStatus.COMPLETED,
        expiredAt: null,
        completedAt: new Date('2000-05-18T10:00:00.000Z'),
        collection: {
          id: 'collection_2',
          collectionNo: 'COL-0002',
          currentOwnerMemberId: 'member_to_2',
        },
      }),
    },
  };

  const service = new TransfersService(
    prisma as never,
    { dispatch: async () => ({}) } as never,
  );

  await assert.rejects(
    () =>
      service.syncTransferOrderOwner(
        'transfer_2',
        { reason: '完成后 owner 未回写，人工修复' },
        'admin_1',
      ),
    (error: unknown) => {
      assert.ok(error instanceof BizError);
      assert.equal(error.code, 'TRANSFER_OWNER_SYNC_NOT_ALLOWED');
      return true;
    },
  );
});

test('TransfersService.listTransferOrders rejects invalid status filter', async () => {
  const prisma = {
    collectionTransferOrder: {
      findMany: async () => [],
      count: async () => 0,
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };

  const service = new TransfersService(
    prisma as never,
    { dispatch: async () => ({}) } as never,
  );

  await assert.rejects(
    () =>
      service.listTransferOrders({
        status: 'INVALID_STATUS',
      }),
    (error: unknown) => {
      assert.ok(error instanceof BizError);
      assert.equal(error.code, 'INVALID_COLLECTION_TRANSFER_STATUS');
      return true;
    },
  );
});

test('TransfersService.getTransferOrderHistory returns admin operation timeline', async () => {
  const prisma = {
    collectionTransferOrder: {
      findUnique: async () => ({
        id: 'transfer_1',
        transferNo: 'TR-0001',
        operationRecords: [
          {
            id: 'op_2',
            actionType: 'ADMIN_SYNC_OWNER',
            reason: '历史补偿漏写 owner',
            beforeSnapshot: {
              status: 'COMPLETED',
              currentOwnerMemberId: 'member_from_1',
            },
            afterSnapshot: {
              status: 'COMPLETED',
              currentOwnerMemberId: 'member_to_2',
            },
            createdAt: new Date('2026-05-18T10:35:00.000Z'),
            operatorAdminUser: {
              id: 'admin_1',
              accountNo: 'ADM000001',
              displayName: '系统管理员',
            },
          },
        ],
      }),
    },
  };

  const service = new TransfersService(
    prisma as never,
    { dispatch: async () => ({}) } as never,
  );

  const result = await service.getTransferOrderHistory('transfer_1');

  assert.equal(result.transferId, 'transfer_1');
  assert.equal(result.totalRecords, 1);
  assert.equal(result.items[0]?.actionType, 'ADMIN_SYNC_OWNER');
  assert.equal(result.items[0]?.beforeCurrentOwnerMemberId, 'member_from_1');
  assert.equal(result.items[0]?.afterCurrentOwnerMemberId, 'member_to_2');
  assert.equal(result.items[0]?.operatorAdminAccountNo, 'ADM000001');
});
