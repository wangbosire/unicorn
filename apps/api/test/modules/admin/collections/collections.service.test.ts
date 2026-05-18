import * as assert from 'node:assert/strict';
import {
  CollectionContentEditStatus,
  CollectionContentPublishStatus,
  CollectionContentReviewStatus,
  CollectionStatus,
} from '@prisma/client';
import { test } from 'vitest';
import { BizError } from '../../../../src/common/http/biz-error';
import { CollectionsService } from '../../../../src/modules/admin/collections/collections.service';

function createCollectionsPrismaMock() {
  const collections: Array<{
    id: string;
    collectionNo: string;
    seriesId: string;
    batchId: string;
    status: CollectionStatus;
    currentOwnerMemberId: string | null;
    claimedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    series: { id: string; name: string };
    batch: { id: string; name: string };
    currentOwnerMember: {
      id: string;
      memberNo: string;
      nickname: string;
    } | null;
    comments: Array<{ createdAt: Date }>;
    contentVersions: Array<{
      id: string;
      versionNo: number;
      title: string;
      summary: string;
      coverImageUrl: string | null;
      editStatus: CollectionContentEditStatus;
      publishStatus: CollectionContentPublishStatus;
      submittedAt: Date | null;
      publishedAt: Date | null;
      reviewRecords: Array<{ reviewStatus: CollectionContentReviewStatus }>;
    }>;
    _count: {
      reviewRecords: number;
      contentVersions: number;
      comments: number;
    };
  }> = [
    {
      id: 'col_1',
      collectionNo: 'COL-001',
      seriesId: 'ser_1',
      batchId: 'bat_1',
      status: CollectionStatus.OWNED,
      currentOwnerMemberId: 'mem_1',
      claimedAt: new Date('2026-05-10T08:00:00.000Z'),
      createdAt: new Date('2026-05-09T08:00:00.000Z'),
      updatedAt: new Date('2026-05-10T08:00:00.000Z'),
    series: { id: 'ser_1', name: '星辉远征' },
    batch: { id: 'bat_1', name: '第一批' },
    currentOwnerMember: {
      id: 'mem_1',
      memberNo: 'MEM-001',
      nickname: '小王',
    },
      comments: [{ createdAt: new Date('2026-05-12T10:00:00.000Z') }],
      contentVersions: [
        {
          id: 'ver_2',
          versionNo: 2,
          title: '公开版',
          summary: '已公开摘要',
          coverImageUrl: 'https://example.com/2.png',
          editStatus: CollectionContentEditStatus.APPROVED,
          publishStatus: CollectionContentPublishStatus.PUBLISHED,
          submittedAt: new Date('2026-05-11T08:00:00.000Z'),
          publishedAt: new Date('2026-05-11T10:00:00.000Z'),
          reviewRecords: [
            { reviewStatus: CollectionContentReviewStatus.MANUAL_APPROVED },
          ],
        },
        {
          id: 'ver_1',
          versionNo: 1,
          title: '草稿版',
          summary: '旧版本摘要',
          coverImageUrl: null,
          editStatus: CollectionContentEditStatus.REJECTED,
          publishStatus: CollectionContentPublishStatus.UNPUBLISHED,
          submittedAt: new Date('2026-05-10T07:00:00.000Z'),
          publishedAt: null,
          reviewRecords: [
            { reviewStatus: CollectionContentReviewStatus.MACHINE_REJECTED },
          ],
        },
      ],
      _count: { reviewRecords: 2, contentVersions: 2, comments: 3 },
    },
    {
      id: 'col_2',
      collectionNo: 'COL-002',
      seriesId: 'ser_2',
      batchId: 'bat_2',
      status: CollectionStatus.PENDING_CLAIM,
      currentOwnerMemberId: null,
      claimedAt: null,
      createdAt: new Date('2026-05-08T08:00:00.000Z'),
      updatedAt: new Date('2026-05-08T08:00:00.000Z'),
      series: { id: 'ser_2', name: '旧城复苏' },
      batch: { id: 'bat_2', name: '第二批' },
      currentOwnerMember: null,
      comments: [],
      contentVersions: [],
      _count: { reviewRecords: 0, contentVersions: 0, comments: 0 },
    },
  ];

  const prisma = {
    collection: {
      findMany: async ({
        where,
        skip,
        take,
      }: {
        where: {
          status?: CollectionStatus;
          currentOwnerMemberId?: string;
          seriesId?: string;
          batchId?: string;
          collectionNo?: string;
        };
        skip: number;
        take: number;
      }) =>
        filterCollections(collections, where)
          .slice()
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
          .slice(skip, skip + take),
      count: async ({
        where,
      }: {
        where: {
          status?: CollectionStatus;
          currentOwnerMemberId?: string;
          seriesId?: string;
          batchId?: string;
          collectionNo?: string;
        };
      }) => filterCollections(collections, where).length,
      findUnique: async ({
        where,
      }: {
        where: { id: string };
      }) =>
        collections.find((item) => item.id === where.id) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { status: CollectionStatus };
      }) => {
        const current = collections.find((item) => item.id === where.id);
        assert.ok(current);
        current.status = data.status;
        current.updatedAt = new Date('2026-05-15T12:00:00.000Z');
        return {
          id: current.id,
          collectionNo: current.collectionNo,
          status: current.status,
          updatedAt: current.updatedAt,
        };
      },
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };

  return { prisma, collections };
}

function filterCollections(
  collections: Array<{
    id: string;
    collectionNo: string;
    seriesId: string;
    batchId: string;
    status: CollectionStatus;
    currentOwnerMemberId: string | null;
    createdAt: Date;
  }>,
  where: {
    status?: CollectionStatus;
    currentOwnerMemberId?: string;
    seriesId?: string;
    batchId?: string;
    collectionNo?: string;
  },
) {
  return collections.filter((item) => {
    if (where.status && item.status !== where.status) {
      return false;
    }
    if (
      where.currentOwnerMemberId &&
      item.currentOwnerMemberId !== where.currentOwnerMemberId
    ) {
      return false;
    }
    if (where.seriesId && item.seriesId !== where.seriesId) {
      return false;
    }
    if (where.batchId && item.batchId !== where.batchId) {
      return false;
    }
    if (where.collectionNo && item.collectionNo !== where.collectionNo) {
      return false;
    }
    return true;
  });
}

test('CollectionsService.listCollections returns paginated items', async () => {
  const { prisma } = createCollectionsPrismaMock();
  const service = new CollectionsService(prisma as never);

  const result = await service.listCollections({
    page: '1',
    pageSize: '10',
    status: 'OWNED',
  });

  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.collectionNo, 'COL-001');
  assert.equal(result.items[0]?.seriesName, '星辉远征');
  assert.equal(result.items[0]?.ownerMemberNo, 'MEM-001');
  assert.equal(result.items[0]?.ownerMemberNickname, '小王');
  assert.equal(result.items[0]?.latestContentPublishStatus, 'PUBLISHED');
  assert.equal(result.items[0]?.latestContentReviewStatus, 'MANUAL_APPROVED');
  assert.equal(
    result.items[0]?.claimedAt,
    new Date('2026-05-10T08:00:00.000Z').toISOString(),
  );
});

test('CollectionsService.listCollections rejects invalid status', async () => {
  const { prisma } = createCollectionsPrismaMock();
  const service = new CollectionsService(prisma as never);

  await assert.rejects(
    () => service.listCollections({ status: 'INVALID' }),
    (error: unknown) =>
      error instanceof BizError && error.code === 'INVALID_COLLECTION_STATUS',
  );
});

test('CollectionsService.getCollectionById returns detail summary', async () => {
  const { prisma } = createCollectionsPrismaMock();
  const service = new CollectionsService(prisma as never);

  const result = await service.getCollectionById('col_1');

  assert.equal(result.collectionNo, 'COL-001');
  assert.equal(result.owner?.memberNo, 'MEM-001');
  assert.equal(result.latestContentVersion?.id, 'ver_2');
  assert.equal(result.latestContentVersion?.contentReviewStatus, 'MANUAL_APPROVED');
  assert.equal(result.publishedContentVersion?.publishStatus, 'PUBLISHED');
  assert.equal(result.contentVersionCount, 2);
  assert.equal(result.commentsCount, 3);
  assert.equal(
    result.latestCommentAt,
    new Date('2026-05-12T10:00:00.000Z').getTime(),
  );
  assert.equal(result.reviewRecordCount, 2);
});

test('CollectionsService.getCollectionById throws when missing', async () => {
  const { prisma } = createCollectionsPrismaMock();
  const service = new CollectionsService(prisma as never);

  await assert.rejects(
    () => service.getCollectionById('missing'),
    (error: unknown) =>
      error instanceof BizError && error.code === 'COLLECTION_NOT_FOUND',
  );
});

test('CollectionsService.updateCollectionStatus freezes owned collection', async () => {
  const { prisma } = createCollectionsPrismaMock();
  const service = new CollectionsService(prisma as never);

  const result = await service.updateCollectionStatus('col_1', {
    status: 'FROZEN',
  });

  assert.equal(result.collectionNo, 'COL-001');
  assert.equal(result.status, 'FROZEN');
});

test('CollectionsService.updateCollectionStatus rejects unclaimed collection', async () => {
  const { prisma } = createCollectionsPrismaMock();
  const service = new CollectionsService(prisma as never);

  await assert.rejects(
    () => service.updateCollectionStatus('col_2', { status: 'FROZEN' }),
    (error: unknown) =>
      error instanceof BizError && error.code === 'COLLECTION_STATUS_INVALID',
  );
});

test('CollectionsService.updateCollectionStatus rejects invalid target status', async () => {
  const { prisma } = createCollectionsPrismaMock();
  const service = new CollectionsService(prisma as never);

  await assert.rejects(
    () =>
      service.updateCollectionStatus('col_1', {
        status: 'PENDING_CLAIM',
      } as never),
    (error: unknown) =>
      error instanceof BizError && error.code === 'VALIDATION_ERROR',
  );
});
