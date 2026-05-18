import * as assert from 'node:assert/strict';
import {
  CollectionTransferMode,
  CollectionTransferStatus,
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

  const service = new TransfersService(prisma as never);
  const result = await service.listTransferOrders({
    page: '1',
    pageSize: '20',
    status: 'PENDING_ACCEPT',
  });

  assert.equal(result.total, 2);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0]?.transferNo, 'TR-0001');
  assert.equal(result.items[0]?.fromMemberNo, 'MEM-0001');
  assert.equal(result.items[1]?.transferCode, 'XFER-2026');
  assert.equal(result.items[1]?.toMemberNo, null);
});

test('TransfersService.listTransferOrders rejects invalid status filter', async () => {
  const prisma = {
    collectionTransferOrder: {
      findMany: async () => [],
      count: async () => 0,
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };

  const service = new TransfersService(prisma as never);

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
