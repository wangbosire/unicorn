import * as assert from 'node:assert/strict';
import {
  CollectionContentEditStatus,
  CollectionContentPublishStatus,
  CollectionStatus,
  CollectionTransferMode,
  CollectionTransferStatus,
  MemberStatus,
  NotificationMessageType,
} from '@prisma/client';
import { test } from 'vitest';
import { BizError } from '../../../../src/common/http/biz-error';
import { MemberTransfersService } from '../../../../src/modules/member/transfers/member-transfers.service';
import type { NotificationDispatcherService } from '../../../../src/modules/notifications/notification-dispatcher.service';

function createNoopNotificationDispatcher(): NotificationDispatcherService {
  return { dispatch: async () => undefined as never } as unknown as NotificationDispatcherService;
}

interface RecordedDispatch {
  memberId: string;
  messageType: NotificationMessageType;
}

function createRecordingNotificationDispatcher(): {
  dispatcher: NotificationDispatcherService;
  calls: RecordedDispatch[];
} {
  const calls: RecordedDispatch[] = [];
  const dispatcher = {
    dispatch: async (input: RecordedDispatch) => {
      calls.push({ memberId: input.memberId, messageType: input.messageType });
      return undefined as never;
    },
  } as unknown as NotificationDispatcherService;
  return { dispatcher, calls };
}

function createMemberContextServiceMock(memberId = 'mem_1') {
  return {
    getCurrentActiveMember: async () => ({
      id: memberId,
      status: MemberStatus.ACTIVE,
    }),
  };
}

test('MemberTransfersService.listMemberTransfers returns paginated items', async () => {
  const prisma = {
    collectionTransferOrder: {
      findMany: async () => [
        {
          id: 'transfer_1',
          transferNo: 'TR-000001',
          collectionId: 'col_1',
          fromMemberId: 'mem_1',
          toMemberId: 'mem_2',
          transferMode: CollectionTransferMode.DIRECT_MEMBER,
          transferCode: null,
          status: CollectionTransferStatus.PENDING_ACCEPT,
          expiredAt: new Date('2026-05-25T00:00:00.000Z'),
          completedAt: null,
          createdAt: new Date('2026-05-18T10:00:00.000Z'),
          updatedAt: new Date('2026-05-18T10:00:00.000Z'),
          collection: {
            id: 'col_1',
            collectionNo: 'COL-0001',
          },
          fromMember: {
            id: 'mem_1',
            memberNo: 'MEM-0001',
            nickname: '发起人',
          },
          toMember: {
            id: 'mem_2',
            memberNo: 'MEM-0002',
            nickname: '接收人',
          },
        },
      ],
      count: async () => 1,
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };

  const service = new MemberTransfersService(
    prisma as never,
    createMemberContextServiceMock() as never,
    createNoopNotificationDispatcher(),
  );
  const result = await service.listMemberTransfers(
    { authorization: 'Bearer member.jwt.token' },
    { page: '1', pageSize: '20' },
  );

  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.transferNo, 'TR-000001');
  assert.equal(result.items[0]?.direction, 'outgoing');
});

test('MemberTransfersService.createMemberTransfer creates direct transfer', async () => {
  const createdAt = new Date('2026-05-18T12:00:00.000Z');
  const collection = {
    id: 'col_1',
    collectionNo: 'COL-0001',
    currentOwnerMemberId: 'mem_1',
    status: CollectionStatus.OWNED,
    contentVersions: [
      {
        id: 'ccv_1',
        collectionId: 'col_1',
        versionNo: 1,
        title: '公开内容',
        summary: '',
        coverImageUrl: null,
        contentPayload: {},
        editStatus: CollectionContentEditStatus.APPROVED,
        publishStatus: CollectionContentPublishStatus.PUBLISHED,
        submittedAt: null,
        publishedAt: createdAt,
        createdByMemberId: 'mem_1',
        createdAt,
        updatedAt: createdAt,
      },
    ],
  };

  const prisma = {
    collection: {
      findUnique: async () => collection,
    },
    member: {
      findUnique: async ({ where }: { where: { memberNo?: string; id?: string } }) => {
        if (where.memberNo === 'MEM-0002') {
          return {
            id: 'mem_2',
            memberNo: 'MEM-0002',
            nickname: '目标会员',
            status: MemberStatus.ACTIVE,
          };
        }
        return null;
      },
    },
    collectionTransferOrder: {
      findFirst: async () => null,
      count: async () => 0,
      findUnique: async () => null,
      create: async () => ({
        id: 'transfer_1',
        transferNo: 'TR-000001',
        collectionId: 'col_1',
        fromMemberId: 'mem_1',
        toMemberId: 'mem_2',
        transferMode: CollectionTransferMode.DIRECT_MEMBER,
        transferCode: null,
        status: CollectionTransferStatus.PENDING_ACCEPT,
        expiredAt: new Date('2026-05-25T12:00:00.000Z'),
        completedAt: null,
        createdAt,
        updatedAt: createdAt,
        collection: {
          id: 'col_1',
          collectionNo: 'COL-0001',
        },
        toMember: {
          memberNo: 'MEM-0002',
          nickname: '目标会员',
        },
      }),
    },
  };

  const service = new MemberTransfersService(
    prisma as never,
    createMemberContextServiceMock() as never,
    createNoopNotificationDispatcher(),
  );
  const result = await service.createMemberTransfer(
    { authorization: 'Bearer member.jwt.token' },
    { collectionId: 'col_1' },
    {
      transferMode: 'DIRECT_MEMBER',
      toMemberNo: 'MEM-0002',
    },
  );

  assert.equal(result.transferNo, 'TR-000001');
  assert.equal(result.toMemberNo, 'MEM-0002');
  assert.equal(result.transferMode, 'DIRECT_MEMBER');
});

test('MemberTransfersService.acceptMemberTransferByCode completes transfer and updates owner', async () => {
  const completedAt = new Date('2026-05-18T13:00:00.000Z');
  const tx = {
    collectionTransferOrder: {
      update: async () => ({
        id: 'transfer_1',
        transferNo: 'TR-000001',
        collectionId: 'col_1',
        fromMemberId: 'mem_1',
        toMemberId: 'mem_3',
        transferMode: CollectionTransferMode.TRANSFER_CODE,
        transferCode: 'XFER-DEMO',
        status: CollectionTransferStatus.COMPLETED,
        expiredAt: new Date('2026-05-25T00:00:00.000Z'),
        completedAt,
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: completedAt,
      }),
    },
    collection: {
      update: async () => ({
        id: 'col_1',
      }),
    },
    member: {
      findUnique: async () => ({
        id: 'mem_3',
        memberNo: 'MEM-0003',
        nickname: '新持有人',
      }),
    },
  };

  const prisma = {
    collectionTransferOrder: {
      findFirst: async () => ({
        id: 'transfer_1',
        transferNo: 'TR-000001',
        collectionId: 'col_1',
        fromMemberId: 'mem_1',
        toMemberId: null,
        transferMode: CollectionTransferMode.TRANSFER_CODE,
        transferCode: 'XFER-DEMO',
        status: CollectionTransferStatus.PENDING_ACCEPT,
        expiredAt: new Date('2026-05-25T00:00:00.000Z'),
        completedAt: null,
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
        collection: {
          id: 'col_1',
          collectionNo: 'COL-0001',
        },
      }),
      update: async () => ({
        id: 'transfer_1',
      }),
    },
    $transaction: async <T>(fn: (client: typeof tx) => Promise<T>) => fn(tx),
  };

  const service = new MemberTransfersService(
    prisma as never,
    createMemberContextServiceMock('mem_3') as never,
    createNoopNotificationDispatcher(),
  );
  const result = await service.acceptMemberTransferByCode(
    { authorization: 'Bearer member.jwt.token' },
    { transferCode: 'XFER-DEMO' },
  );

  assert.equal(result.transferId, 'transfer_1');
  assert.equal(result.currentOwnerMemberNo, 'MEM-0003');
  assert.equal(result.status, 'COMPLETED');
});

function createCancelPrismaMock(overrides: {
  fromMemberId?: string;
  status?: CollectionTransferStatus;
  toMemberId?: string | null;
} = {}) {
  const transfer = {
    id: 'transfer_cancel_1',
    transferNo: 'TR-000099',
    collectionId: 'col_99',
    fromMemberId: overrides.fromMemberId ?? 'mem_1',
    toMemberId: overrides.toMemberId === undefined ? 'mem_2' : overrides.toMemberId,
    transferMode: CollectionTransferMode.DIRECT_MEMBER,
    transferCode: null,
    status: overrides.status ?? CollectionTransferStatus.PENDING_ACCEPT,
    expiredAt: new Date('2026-05-30T00:00:00.000Z'),
    completedAt: null,
    createdAt: new Date('2026-05-18T10:00:00.000Z'),
    updatedAt: new Date('2026-05-18T10:00:00.000Z'),
    collection: {
      id: 'col_99',
      collectionNo: 'COL-0099',
    },
  };
  return {
    transfer,
    prisma: {
      collectionTransferOrder: {
        findUnique: async () => transfer,
        update: async () => ({
          ...transfer,
          status: CollectionTransferStatus.CANCELLED,
        }),
      },
    },
  };
}

test('MemberTransfersService.cancelMemberTransfer cancels pending transfer and notifies counterpart', async () => {
  const { prisma } = createCancelPrismaMock();
  const { dispatcher, calls } = createRecordingNotificationDispatcher();
  const service = new MemberTransfersService(
    prisma as never,
    createMemberContextServiceMock('mem_1') as never,
    dispatcher,
  );

  const result = await service.cancelMemberTransfer(
    { authorization: 'Bearer member.jwt.token' },
    { transferId: 'transfer_cancel_1' },
  );

  assert.equal(result.transferId, 'transfer_cancel_1');
  assert.equal(result.status, CollectionTransferStatus.CANCELLED);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.memberId, 'mem_2');
  assert.equal(calls[0]?.messageType, NotificationMessageType.TRANSFER_CANCELLED);
});

test('MemberTransfersService.cancelMemberTransfer skips notification when no counterpart', async () => {
  const { prisma } = createCancelPrismaMock({ toMemberId: null });
  const { dispatcher, calls } = createRecordingNotificationDispatcher();
  const service = new MemberTransfersService(
    prisma as never,
    createMemberContextServiceMock('mem_1') as never,
    dispatcher,
  );

  await service.cancelMemberTransfer(
    { authorization: 'Bearer member.jwt.token' },
    { transferId: 'transfer_cancel_1' },
  );

  assert.equal(calls.length, 0);
});

test('MemberTransfersService.cancelMemberTransfer rejects when not initiator', async () => {
  const { prisma } = createCancelPrismaMock();
  const service = new MemberTransfersService(
    prisma as never,
    createMemberContextServiceMock('mem_other') as never,
    createNoopNotificationDispatcher(),
  );

  await assert.rejects(
    () =>
      service.cancelMemberTransfer(
        { authorization: 'Bearer member.jwt.token' },
        { transferId: 'transfer_cancel_1' },
      ),
    (error: unknown) =>
      error instanceof BizError && error.code === 'TRANSFER_CANCEL_FORBIDDEN',
  );
});

test('MemberTransfersService.cancelMemberTransfer rejects non-pending status', async () => {
  const { prisma } = createCancelPrismaMock({
    status: CollectionTransferStatus.COMPLETED,
  });
  const service = new MemberTransfersService(
    prisma as never,
    createMemberContextServiceMock('mem_1') as never,
    createNoopNotificationDispatcher(),
  );

  await assert.rejects(
    () =>
      service.cancelMemberTransfer(
        { authorization: 'Bearer member.jwt.token' },
        { transferId: 'transfer_cancel_1' },
      ),
    (error: unknown) =>
      error instanceof BizError && error.code === 'TRANSFER_STATUS_INVALID',
  );
});

test('MemberTransfersService.cancelMemberTransfer rejects when transfer not found', async () => {
  const prisma = {
    collectionTransferOrder: {
      findUnique: async () => null,
    },
  };
  const service = new MemberTransfersService(
    prisma as never,
    createMemberContextServiceMock('mem_1') as never,
    createNoopNotificationDispatcher(),
  );

  await assert.rejects(
    () =>
      service.cancelMemberTransfer(
        { authorization: 'Bearer member.jwt.token' },
        { transferId: 'missing_transfer' },
      ),
    (error: unknown) =>
      error instanceof BizError && error.code === 'TRANSFER_NOT_FOUND',
  );
});
