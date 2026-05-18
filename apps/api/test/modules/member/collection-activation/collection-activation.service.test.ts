import * as assert from 'node:assert/strict';
import * as jwt from 'jsonwebtoken';
import { test } from 'vitest';
import {
  ActivationCodeStatus,
  CollectionContentEditStatus,
  CollectionContentPublishStatus,
  CollectionStatus,
  MemberStatus,
} from '@prisma/client';
import { MemberContextService } from '../../../../src/modules/member/auth/member-context.service';
import { CollectionActivationService } from '../../../../src/modules/member/collection-activation/collection-activation.service';
import { BizError } from '../../../../src/common/http/biz-error';
import type { NotificationDispatcherService } from '../../../../src/modules/notifications/notification-dispatcher.service';

function createNoopNotificationDispatcher(): NotificationDispatcherService {
  return { dispatch: async () => undefined as never } as unknown as NotificationDispatcherService;
}

function createMemberAuthContext(memberId = 'mem_1') {
  return {
    authorization: `Bearer ${jwt.sign(
      {
        sub: memberId,
        typ: 'member',
      },
      'dev-member-jwt-secret-change-me',
      { algorithm: 'HS256', expiresIn: '30d' },
    )}`,
  };
}

function createCollectionActivationPrismaMock() {
  const member: {
    id: string;
    memberNo: string;
    nickname: string;
    avatarUrl: string | null;
    mobile: string | null;
    status: MemberStatus;
    registeredAt: Date;
    createdAt: Date;
    updatedAt: Date;
  } = {
    id: 'mem_1',
    memberNo: 'MEM-001',
    nickname: '测试会员',
    avatarUrl: null,
    mobile: null,
    status: MemberStatus.ACTIVE,
    registeredAt: new Date('2026-05-14T00:00:00.000Z'),
    createdAt: new Date('2026-05-14T00:00:00.000Z'),
    updatedAt: new Date('2026-05-14T00:00:00.000Z'),
  };

  const collection: {
    id: string;
    collectionNo: string;
    seriesId: string;
    batchId: string;
    status: CollectionStatus;
    currentOwnerMemberId: string | null;
    claimedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } = {
    id: 'col_1',
    collectionNo: 'COL-001',
    seriesId: 'ser_1',
    batchId: 'bat_1',
    status: CollectionStatus.PENDING_CLAIM,
    currentOwnerMemberId: null as string | null,
    claimedAt: null as Date | null,
    createdAt: new Date('2026-05-14T00:00:00.000Z'),
    updatedAt: new Date('2026-05-14T00:00:00.000Z'),
  };

  const activationCode: {
    id: string;
    code: string;
    batchId: string;
    collectionId: string;
    status: ActivationCodeStatus;
    issuedChannel: string | null;
    issuedAt: Date | null;
    usedByMemberId: string | null;
    usedAt: Date | null;
    expiredAt: Date | null;
    voidedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } = {
    id: 'ac_1',
    code: 'ABCD-EFGH-IJKL',
    batchId: 'bat_1',
    collectionId: collection.id,
    status: ActivationCodeStatus.UNISSUED,
    issuedChannel: 'offline_event',
    issuedAt: null,
    usedByMemberId: null as string | null,
    usedAt: null as Date | null,
    expiredAt: new Date('2026-06-14T00:00:00.000Z'),
    voidedAt: null,
    createdAt: new Date('2026-05-14T00:00:00.000Z'),
    updatedAt: new Date('2026-05-14T00:00:00.000Z'),
  };

  const contentVersions: Array<{
    id: string;
    collectionId: string;
    versionNo: number;
    title: string;
    summary: string;
    coverImageUrl: string | null;
    contentPayload: Record<string, unknown>;
    editStatus: CollectionContentEditStatus;
    publishStatus: CollectionContentPublishStatus;
    submittedAt: Date | null;
    publishedAt: Date | null;
    createdByMemberId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  const tx = {
    activationCode: {
      findUnique: async ({ where }: { where: { code: string } }) =>
        where.code === activationCode.code
          ? { ...activationCode, collection: { ...collection } }
          : null,
      update: async ({
        data,
      }: {
        data: {
          status: ActivationCodeStatus;
          usedByMemberId: string;
          usedAt: Date;
        };
      }) => {
        activationCode.status = data.status;
        activationCode.usedByMemberId = data.usedByMemberId;
        activationCode.usedAt = data.usedAt;
        activationCode.updatedAt = data.usedAt;
        return activationCode;
      },
    },
    collection: {
      update: async ({
        data,
      }: {
        data: {
          status: CollectionStatus;
          currentOwnerMemberId: string;
          claimedAt: Date;
        };
      }) => {
        collection.status = data.status;
        collection.currentOwnerMemberId = data.currentOwnerMemberId;
        collection.claimedAt = data.claimedAt;
        collection.updatedAt = data.claimedAt;
        return collection;
      },
    },
    collectionContentVersion: {
      findFirst: async () => null,
      create: async ({
        data,
      }: {
        data: {
          collectionId: string;
          versionNo: number;
          title: string;
          summary: string;
          contentPayload: Record<string, unknown>;
          editStatus: CollectionContentEditStatus;
          publishStatus: CollectionContentPublishStatus;
          createdByMemberId: string;
        };
      }) => {
        const now = new Date('2026-05-14T02:00:00.000Z');
        const record = {
          id: 'ccv_1',
          collectionId: data.collectionId,
          versionNo: data.versionNo,
          title: data.title,
          summary: data.summary,
          coverImageUrl: null,
          contentPayload: data.contentPayload,
          editStatus: data.editStatus,
          publishStatus: data.publishStatus,
          submittedAt: null,
          publishedAt: null,
          createdByMemberId: data.createdByMemberId,
          createdAt: now,
          updatedAt: now,
        };
        contentVersions.push(record);
        return record;
      },
    },
  };

  const prisma = {
    member: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === member.id ? member : null,
    },
    $transaction: async <T>(callback: (client: typeof tx) => Promise<T>) => callback(tx),
  };

  return { prisma, activationCode, collection, contentVersions };
}

test('CollectionActivationService.activateCollection claims collection and initializes first content version', async () => {
  const { prisma, activationCode, collection, contentVersions } =
    createCollectionActivationPrismaMock();
  const memberContextService = new MemberContextService(prisma as never);
  const service = new CollectionActivationService(
    prisma as never,
    memberContextService,
    createNoopNotificationDispatcher(),
  );

  const result = await service.activateCollection(
    createMemberAuthContext(),
    {
      activationCode: 'ABCD-EFGH-IJKL',
    },
  );

  assert.equal(result.collection.id, 'col_1');
  assert.equal(result.collection.collectionNo, 'COL-001');
  assert.equal(result.collection.status, CollectionStatus.OWNED);
  assert.equal(activationCode.status, ActivationCodeStatus.USED);
  assert.equal(activationCode.usedByMemberId, 'mem_1');
  assert.equal(collection.status, CollectionStatus.OWNED);
  assert.equal(collection.currentOwnerMemberId, 'mem_1');
  assert.equal(contentVersions.length, 1);
  assert.equal(contentVersions[0]?.versionNo, 1);
  assert.equal(contentVersions[0]?.editStatus, CollectionContentEditStatus.DRAFT);
  assert.equal(
    contentVersions[0]?.publishStatus,
    CollectionContentPublishStatus.UNPUBLISHED,
  );
});

test('CollectionActivationService.activateCollection rejects already used activation code', async () => {
  const { prisma, activationCode } = createCollectionActivationPrismaMock();
  activationCode.status = ActivationCodeStatus.USED;
  const memberContextService = new MemberContextService(prisma as never);
  const service = new CollectionActivationService(
    prisma as never,
    memberContextService,
    createNoopNotificationDispatcher(),
  );

  await assert.rejects(
    () =>
      service.activateCollection(
        createMemberAuthContext(),
        {
          activationCode: 'ABCD-EFGH-IJKL',
        },
      ),
    (error: unknown) =>
      error instanceof BizError && error.code === 'ACTIVATION_CODE_USED',
  );
});

test('CollectionActivationService.activateCollection rejects invalid activation code', async () => {
  const { prisma } = createCollectionActivationPrismaMock();
  const memberContextService = new MemberContextService(prisma as never);
  const service = new CollectionActivationService(
    prisma as never,
    memberContextService,
    createNoopNotificationDispatcher(),
  );

  await assert.rejects(
    () =>
      service.activateCollection(
        createMemberAuthContext(),
        {
          activationCode: 'INVALID-CODE',
        },
      ),
    (error: unknown) =>
      error instanceof BizError && error.code === 'ACTIVATION_CODE_INVALID',
  );
});

test('CollectionActivationService.activateCollection rejects expired activation code', async () => {
  const { prisma, activationCode } = createCollectionActivationPrismaMock();
  activationCode.expiredAt = new Date('2026-05-01T00:00:00.000Z');
  const memberContextService = new MemberContextService(prisma as never);
  const service = new CollectionActivationService(
    prisma as never,
    memberContextService,
    createNoopNotificationDispatcher(),
  );

  await assert.rejects(
    () =>
      service.activateCollection(
        createMemberAuthContext(),
        {
          activationCode: 'ABCD-EFGH-IJKL',
        },
      ),
    (error: unknown) =>
      error instanceof BizError && error.code === 'ACTIVATION_CODE_EXPIRED',
  );
});

test('CollectionActivationService.activateCollection rejects voided activation code', async () => {
  const { prisma, activationCode } = createCollectionActivationPrismaMock();
  activationCode.status = ActivationCodeStatus.VOIDED;
  const memberContextService = new MemberContextService(prisma as never);
  const service = new CollectionActivationService(
    prisma as never,
    memberContextService,
    createNoopNotificationDispatcher(),
  );

  await assert.rejects(
    () =>
      service.activateCollection(
        createMemberAuthContext(),
        {
          activationCode: 'ABCD-EFGH-IJKL',
        },
      ),
    (error: unknown) =>
      error instanceof BizError && error.code === 'ACTIVATION_CODE_VOIDED',
  );
});

test('CollectionActivationService.activateCollection rejects empty activation code', async () => {
  const { prisma } = createCollectionActivationPrismaMock();
  const memberContextService = new MemberContextService(prisma as never);
  const service = new CollectionActivationService(
    prisma as never,
    memberContextService,
    createNoopNotificationDispatcher(),
  );

  await assert.rejects(
    () =>
      service.activateCollection(
        createMemberAuthContext(),
        {
          activationCode: '   ',
        },
      ),
    (error: unknown) =>
      error instanceof BizError && error.code === 'ACTIVATION_CODE_REQUIRED',
  );
});

test('CollectionActivationService.activateCollection rejects activation code with EXPIRED status', async () => {
  const { prisma, activationCode } = createCollectionActivationPrismaMock();
  activationCode.status = ActivationCodeStatus.EXPIRED;
  activationCode.expiredAt = new Date('2099-01-01T00:00:00.000Z');
  const memberContextService = new MemberContextService(prisma as never);
  const service = new CollectionActivationService(
    prisma as never,
    memberContextService,
    createNoopNotificationDispatcher(),
  );

  await assert.rejects(
    () =>
      service.activateCollection(
        createMemberAuthContext(),
        {
          activationCode: 'ABCD-EFGH-IJKL',
        },
      ),
    (error: unknown) =>
      error instanceof BizError && error.code === 'ACTIVATION_CODE_EXPIRED',
  );
});

test('CollectionActivationService.activateCollection rejects when member account is not active', async () => {
  const { prisma } = createCollectionActivationPrismaMock();
  prisma.member.findUnique = async ({ where }: { where: { id: string } }) =>
    where.id === 'mem_1'
      ? {
          id: 'mem_1',
          memberNo: 'MEM-001',
          nickname: '冻结会员',
          avatarUrl: null,
          mobile: null,
          status: MemberStatus.FROZEN,
          registeredAt: new Date('2026-05-14T00:00:00.000Z'),
          createdAt: new Date('2026-05-14T00:00:00.000Z'),
          updatedAt: new Date('2026-05-14T00:00:00.000Z'),
        }
      : null;
  const memberContextService = new MemberContextService(prisma as never);
  const service = new CollectionActivationService(
    prisma as never,
    memberContextService,
    createNoopNotificationDispatcher(),
  );

  await assert.rejects(
    () =>
      service.activateCollection(
        createMemberAuthContext(),
        {
          activationCode: 'ABCD-EFGH-IJKL',
        },
      ),
    (error: unknown) =>
      error instanceof BizError && error.code === 'MEMBER_ACCOUNT_FROZEN',
  );
});

test('CollectionActivationService.activateCollection rejects when member does not exist', async () => {
  const { prisma } = createCollectionActivationPrismaMock();
  const memberContextService = new MemberContextService(prisma as never);
  const service = new CollectionActivationService(
    prisma as never,
    memberContextService,
    createNoopNotificationDispatcher(),
  );

  await assert.rejects(
    () =>
      service.activateCollection(
        createMemberAuthContext('mem_missing'),
        {
          activationCode: 'ABCD-EFGH-IJKL',
        },
      ),
    (error: unknown) =>
      error instanceof BizError && error.code === 'UNAUTHORIZED',
  );
});
