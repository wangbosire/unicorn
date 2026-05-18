import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  CollectionContentEditStatus,
  CollectionContentPublishStatus,
  CollectionContentReviewSource,
  CollectionContentReviewStage,
  CollectionContentReviewStatus,
} from '@prisma/client';
import { BizError } from '../../../../src/common/http/biz-error';
import { CollectionReviewsService } from '../../../../src/modules/admin/collection-reviews/collection-reviews.service';

function createCollectionReviewsPrismaMock() {
  const reviewRecords: Array<{
    id: string;
    collectionId: string;
    contentVersionId: string;
    reviewStage: CollectionContentReviewStage;
    reviewStatus: CollectionContentReviewStatus;
    reviewSource: CollectionContentReviewSource;
    reviewReason: string | null;
    reviewedByAdminUserId: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
    collection: {
      id: string;
      collectionNo: string;
      seriesId: string;
      batchId: string;
      series?: {
        id: string;
        seriesNo: string;
        name: string;
      };
      batch?: {
        id: string;
        batchNo: string;
        name: string;
      };
      currentOwnerMember?: {
        id: string;
        memberNo: string;
        nickname: string;
      } | null;
    };
    contentVersion: {
      id: string;
      versionNo: number;
      submittedAt: Date | null;
      title?: string;
      summary?: string;
      coverImageUrl?: string | null;
      contentPayload?: Record<string, unknown>;
      createdByMember?: {
        id: string;
        memberNo: string;
        nickname: string;
      } | null;
      createdByMemberId?: string | null;
      editStatus?: CollectionContentEditStatus;
      publishStatus?: CollectionContentPublishStatus;
      publishedAt?: Date | null;
    };
  }> = [
    {
      id: 'crr_0',
      collectionId: 'col_1',
      contentVersionId: 'ccv_2',
      reviewStage: CollectionContentReviewStage.MACHINE,
      reviewStatus: CollectionContentReviewStatus.MACHINE_APPROVED,
      reviewSource: CollectionContentReviewSource.SYSTEM,
      reviewReason: null,
      reviewedByAdminUserId: null,
      reviewedAt: new Date('2026-05-14T04:15:00.000Z'),
      createdAt: new Date('2026-05-14T04:15:00.000Z'),
      collection: {
        id: 'col_1',
        collectionNo: 'COL-001',
        seriesId: 'ser_1',
        batchId: 'bat_1',
        series: {
          id: 'ser_1',
          seriesNo: 'SER-001',
          name: '星辉远征',
        },
        batch: {
          id: 'bat_1',
          batchNo: 'BAT-001',
          name: '星辉远征首发',
        },
        currentOwnerMember: {
          id: 'mem_1',
          memberNo: 'M-001',
          nickname: '小宇',
        },
      },
      contentVersion: {
        id: 'ccv_2',
        versionNo: 2,
        submittedAt: new Date('2026-05-14T04:30:00.000Z'),
        title: '星辉远征第二版',
        summary: '更新后的内容摘要',
        coverImageUrl: 'https://example.com/cover-2.png',
        contentPayload: { blocks: [{ type: 'paragraph', text: 'hello' }] },
        createdByMemberId: 'mem_1',
        createdByMember: {
          id: 'mem_1',
          memberNo: 'M-001',
          nickname: '小宇',
        },
        editStatus: CollectionContentEditStatus.UNDER_REVIEW,
        publishStatus: CollectionContentPublishStatus.UNPUBLISHED,
      },
    },
    {
      id: 'crr_1',
      collectionId: 'col_1',
      contentVersionId: 'ccv_2',
      reviewStage: CollectionContentReviewStage.MANUAL,
      reviewStatus: CollectionContentReviewStatus.PENDING_MANUAL,
      reviewSource: CollectionContentReviewSource.SYSTEM,
      reviewReason: '同步机审策略已通过，待人工复核',
      reviewedByAdminUserId: null,
      reviewedAt: null,
      createdAt: new Date('2026-05-14T05:00:00.000Z'),
      collection: {
        id: 'col_1',
        collectionNo: 'COL-001',
        seriesId: 'ser_1',
        batchId: 'bat_1',
        series: {
          id: 'ser_1',
          seriesNo: 'SER-001',
          name: '星辉远征',
        },
        batch: {
          id: 'bat_1',
          batchNo: 'BAT-001',
          name: '星辉远征首发',
        },
        currentOwnerMember: {
          id: 'mem_1',
          memberNo: 'M-001',
          nickname: '小宇',
        },
      },
      contentVersion: {
        id: 'ccv_2',
        versionNo: 2,
        submittedAt: new Date('2026-05-14T04:30:00.000Z'),
        title: '星辉远征第二版',
        summary: '更新后的内容摘要',
        coverImageUrl: 'https://example.com/cover-2.png',
        contentPayload: { blocks: [{ type: 'paragraph', text: 'hello' }] },
        createdByMemberId: 'mem_1',
        createdByMember: {
          id: 'mem_1',
          memberNo: 'M-001',
          nickname: '小宇',
        },
        editStatus: CollectionContentEditStatus.UNDER_REVIEW,
        publishStatus: CollectionContentPublishStatus.UNPUBLISHED,
      },
    },
    {
      id: 'crr_2',
      collectionId: 'col_2',
      contentVersionId: 'ccv_3',
      reviewStage: CollectionContentReviewStage.MACHINE,
      reviewStatus: CollectionContentReviewStatus.PENDING_MACHINE,
      reviewSource: CollectionContentReviewSource.SYSTEM,
      reviewReason: null,
      reviewedByAdminUserId: null,
      reviewedAt: null,
      createdAt: new Date('2026-05-14T06:00:00.000Z'),
      collection: {
        id: 'col_2',
        collectionNo: 'COL-002',
        seriesId: 'ser_2',
        batchId: 'bat_2',
        series: {
          id: 'ser_2',
          seriesNo: 'SER-002',
          name: '旧城复苏',
        },
        batch: {
          id: 'bat_2',
          batchNo: 'BAT-002',
          name: '旧城首发',
        },
        currentOwnerMember: {
          id: 'mem_2',
          memberNo: 'M-002',
          nickname: '阿洛',
        },
      },
      contentVersion: {
        id: 'ccv_3',
        versionNo: 1,
        submittedAt: new Date('2026-05-14T05:40:00.000Z'),
        title: '旧城复苏第一版',
        summary: '首个版本摘要',
        coverImageUrl: null,
        contentPayload: { blocks: [] },
        createdByMemberId: 'mem_2',
        createdByMember: {
          id: 'mem_2',
          memberNo: 'M-002',
          nickname: '阿洛',
        },
        editStatus: CollectionContentEditStatus.UNDER_REVIEW,
        publishStatus: CollectionContentPublishStatus.UNPUBLISHED,
      },
    },
  ];

  const contentVersions = [
    {
      id: 'ccv_2',
      collectionId: 'col_1',
      versionNo: 2,
      submittedAt: new Date('2026-05-14T04:30:00.000Z'),
      editStatus: CollectionContentEditStatus.UNDER_REVIEW,
      publishStatus: CollectionContentPublishStatus.UNPUBLISHED,
      publishedAt: null as Date | null,
    },
    {
      id: 'ccv_3',
      collectionId: 'col_2',
      versionNo: 1,
      submittedAt: new Date('2026-05-14T05:40:00.000Z'),
      editStatus: CollectionContentEditStatus.UNDER_REVIEW,
      publishStatus: CollectionContentPublishStatus.UNPUBLISHED,
      publishedAt: null as Date | null,
    },
  ];

  const collections = [
    { id: 'col_1', collectionNo: 'COL-001' },
    { id: 'col_2', collectionNo: 'COL-002' },
  ];

  const collection = {
    findFirst: async ({
      where,
    }: {
      where: { collectionNo?: string };
    }) => collections.find((row) => row.collectionNo === where.collectionNo) ?? null,
  };

  const collectionContentReviewRecord = {
    findMany: async (args: {
      where:
        | {
            reviewStatus?: CollectionContentReviewStatus;
            collection?: {
              seriesId?: string;
              batchId?: string;
              collectionNo?: string;
            };
            collectionId?: string;
            contentVersionId?: string;
          }
        | Record<string, unknown>;
      skip?: number;
      take?: number;
      orderBy?: { createdAt: 'asc' | 'desc' };
    }) => {
      const { where, skip = 0, take, orderBy } = args;

      if (where && typeof (where as { collectionId?: string }).collectionId === 'string') {
        const collectionId = (where as { collectionId: string }).collectionId;
        const versionFilter = (where as { contentVersionId?: string }).contentVersionId;
        let filtered = reviewRecords.filter((item) => item.collectionId === collectionId);
        if (versionFilter) {
          filtered = filtered.filter((item) => item.contentVersionId === versionFilter);
        }
        const direction = orderBy?.createdAt === 'asc' ? 1 : -1;
        const sorted = filtered.slice().sort((left, right) => {
          const delta = left.createdAt.getTime() - right.createdAt.getTime();
          return direction * delta;
        });
        const limit = typeof take === 'number' ? take : sorted.length;
        return sorted.slice(0, limit).map((item) => ({
          ...item,
          reviewedByAdminUser: item.reviewedByAdminUserId
            ? { displayName: '测试审核员' }
            : null,
        }));
      }

      const queueWhere = where as {
        reviewStatus?: CollectionContentReviewStatus;
        collection?: {
          seriesId?: string;
          batchId?: string;
          collectionNo?: string;
        };
      };

      const filteredItems = reviewRecords.filter((item) => {
        if (queueWhere.reviewStatus && item.reviewStatus !== queueWhere.reviewStatus) {
          return false;
        }

        if (
          queueWhere.collection?.seriesId &&
          item.collection.seriesId !== queueWhere.collection.seriesId
        ) {
          return false;
        }

        if (
          queueWhere.collection?.batchId &&
          item.collection.batchId !== queueWhere.collection.batchId
        ) {
          return false;
        }

        if (
          queueWhere.collection?.collectionNo &&
          item.collection.collectionNo !== queueWhere.collection.collectionNo
        ) {
          return false;
        }

        return true;
      });

      const pageTake = typeof take === 'number' ? take : 20;
      return filteredItems
        .slice()
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .slice(skip, skip + pageTake);
    },
    count: async ({
      where,
    }: {
      where: {
        reviewStatus?: CollectionContentReviewStatus;
        collection?: {
          seriesId?: string;
          batchId?: string;
          collectionNo?: string;
        };
      };
    }) =>
      reviewRecords.filter((item) => {
        if (where.reviewStatus && item.reviewStatus !== where.reviewStatus) {
          return false;
        }

        if (
          where.collection?.seriesId &&
          item.collection.seriesId !== where.collection.seriesId
        ) {
          return false;
        }

        if (
          where.collection?.batchId &&
          item.collection.batchId !== where.collection.batchId
        ) {
          return false;
        }

        if (
          where.collection?.collectionNo &&
          item.collection.collectionNo !== where.collection.collectionNo
        ) {
          return false;
        }

        return true;
      }).length,
    findUnique: async ({
      where,
    }: {
      where: { id: string };
    }) => reviewRecords.find((item) => item.id === where.id) ?? null,
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: {
        reviewStatus: CollectionContentReviewStatus;
        reviewSource: CollectionContentReviewSource;
        reviewReason: string | null;
        reviewedAt: Date;
      };
    }) => {
      const record = reviewRecords.find((item) => item.id === where.id);

      if (!record) {
        throw new Error('review record not found');
      }

      Object.assign(record, data);
      return { ...record };
    },
  };

  const collectionContentVersion = {
    findFirst: async ({
      where,
    }: {
      where: { id: string; collectionId?: string };
    }) => {
      const row = contentVersions.find((item) => item.id === where.id);
      if (!row) {
        return null;
      }
      if (where.collectionId && row.collectionId !== where.collectionId) {
        return null;
      }
      return row;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: {
        editStatus: CollectionContentEditStatus;
        publishStatus: CollectionContentPublishStatus;
        publishedAt?: Date | null;
      };
    }) => {
      const version = contentVersions.find((item) => item.id === where.id);

      if (!version) {
        throw new Error('content version not found');
      }

      Object.assign(version, data);
      return { ...version };
    },
  };

  const prisma = {
    collection,
    collectionContentReviewRecord,
    collectionContentVersion,
    $transaction: async (operationsOrCallback: unknown) => {
      if (typeof operationsOrCallback === 'function') {
        return (
          operationsOrCallback as (client: {
            collectionContentReviewRecord: typeof collectionContentReviewRecord;
            collectionContentVersion: typeof collectionContentVersion;
          }) => Promise<unknown>
        )({
          collectionContentReviewRecord,
          collectionContentVersion,
        });
      }

      return Promise.all(operationsOrCallback as Promise<unknown>[]);
    },
  };

  return { prisma, reviewRecords, contentVersions };
}

test('CollectionReviewsService.listCollectionReviews returns paginated review queue', async () => {
  const { prisma } = createCollectionReviewsPrismaMock();
  const service = new CollectionReviewsService(prisma as never);

  const result = await service.listCollectionReviews({
    page: '1',
    pageSize: '20',
  });

  assert.equal(result.total, 3);
  assert.equal(result.items.length, 3);
  assert.equal(result.items[0]?.reviewId, 'crr_2');
  assert.equal(result.items[0]?.collectionNo, 'COL-002');
  assert.equal(result.items[0]?.seriesNo, 'SER-002');
  assert.equal(result.items[0]?.batchNo, 'BAT-002');
  assert.equal(result.items[0]?.ownerMemberNo, 'M-002');
  assert.equal(result.items[0]?.title, '旧城复苏第一版');
  assert.equal(result.items[0]?.editStatus, CollectionContentEditStatus.UNDER_REVIEW);
  assert.equal(result.items[1]?.reviewStatus, CollectionContentReviewStatus.PENDING_MANUAL);
  assert.equal(
    result.items[1]?.reviewReason,
    '同步机审策略已通过，待人工复核',
  );
});

test('CollectionReviewsService.getCollectionReviewById returns enriched review detail', async () => {
  const { prisma } = createCollectionReviewsPrismaMock();
  const service = new CollectionReviewsService(prisma as never);

  const result = await service.getCollectionReviewById('crr_1');

  assert.equal(result.reviewId, 'crr_1');
  assert.equal(result.seriesNo, 'SER-001');
  assert.equal(result.seriesName, '星辉远征');
  assert.equal(result.batchNo, 'BAT-001');
  assert.equal(result.ownerMemberNo, 'M-001');
  assert.equal(result.createdByMemberNo, 'M-001');
  assert.equal(result.title, '星辉远征第二版');
  assert.equal(result.coverImageUrl, 'https://example.com/cover-2.png');
  assert.deepEqual(result.contentPayload, {
    blocks: [{ type: 'paragraph', text: 'hello' }],
  });
  assert.equal(result.editStatus, CollectionContentEditStatus.UNDER_REVIEW);
  assert.equal(result.publishStatus, CollectionContentPublishStatus.UNPUBLISHED);
});

test('CollectionReviewsService.listCollectionReviews supports filtering by collectionNo', async () => {
  const { prisma } = createCollectionReviewsPrismaMock();
  const service = new CollectionReviewsService(prisma as never);

  const result = await service.listCollectionReviews({
    collectionNo: 'COL-002',
  });

  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.reviewId, 'crr_2');
});

test('CollectionReviewsService.listCollectionReviews merges seriesId and batchId on collection filter', async () => {
  const { prisma } = createCollectionReviewsPrismaMock();
  const service = new CollectionReviewsService(prisma as never);

  const result = await service.listCollectionReviews({
    seriesId: 'ser_1',
    batchId: 'bat_1',
  });

  assert.equal(result.total, 2);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0]?.reviewId, 'crr_1');
  assert.equal(result.items[1]?.reviewId, 'crr_0');
});

test('CollectionReviewsService.listCollectionReviews supports filtering by review status and series', async () => {
  const { prisma } = createCollectionReviewsPrismaMock();
  const service = new CollectionReviewsService(prisma as never);

  const result = await service.listCollectionReviews({
    reviewStatus: CollectionContentReviewStatus.PENDING_MANUAL,
    seriesId: 'ser_1',
  });

  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.reviewId, 'crr_1');
  assert.equal(result.items[0]?.versionNo, 2);
});

test('CollectionReviewsService.listCollectionReviews rejects invalid review status', async () => {
  const { prisma } = createCollectionReviewsPrismaMock();
  const service = new CollectionReviewsService(prisma as never);

  await assert.rejects(
    () =>
      service.listCollectionReviews({
        reviewStatus: 'INVALID_STATUS',
      }),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'INVALID_COLLECTION_REVIEW_STATUS',
  );
});

test('CollectionReviewsService.approveCollectionReview marks review approved and publishes content', async () => {
  const { prisma, reviewRecords, contentVersions } = createCollectionReviewsPrismaMock();
  const service = new CollectionReviewsService(prisma as never);

  const result = await service.approveCollectionReview('crr_1', {
    comment: '人工审核通过',
  });

  assert.equal(result.reviewId, 'crr_1');
  assert.equal(result.reviewStatus, CollectionContentReviewStatus.MANUAL_APPROVED);
  assert.equal(result.publishStatus, CollectionContentPublishStatus.PUBLISHED);
  assert.ok(result.reviewedAt);
  const afterApprove = reviewRecords.find((row) => row.id === 'crr_1');
  assert.equal(
    afterApprove?.reviewStatus,
    CollectionContentReviewStatus.MANUAL_APPROVED,
  );
  assert.equal(afterApprove?.reviewSource, CollectionContentReviewSource.ADMIN);
  assert.equal(afterApprove?.reviewReason, '人工审核通过');
  assert.equal(
    contentVersions[0]?.editStatus,
    CollectionContentEditStatus.APPROVED,
  );
  assert.equal(
    contentVersions[0]?.publishStatus,
    CollectionContentPublishStatus.PUBLISHED,
  );
});

test('CollectionReviewsService.approveCollectionReview rejects missing review record', async () => {
  const { prisma } = createCollectionReviewsPrismaMock();
  const service = new CollectionReviewsService(prisma as never);

  await assert.rejects(
    () => service.approveCollectionReview('missing_review', {}),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'REVIEW_RECORD_NOT_FOUND' &&
      error.status === 404,
  );
});

test('CollectionReviewsService.approveCollectionReview rejects empty review id', async () => {
  const { prisma } = createCollectionReviewsPrismaMock();
  const service = new CollectionReviewsService(prisma as never);

  await assert.rejects(
    () => service.approveCollectionReview('   ', {}),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'VALIDATION_ERROR' &&
      error.message.includes('review id'),
  );
});

test('CollectionReviewsService.approveCollectionReview rejects invalid review status', async () => {
  const { prisma, reviewRecords } = createCollectionReviewsPrismaMock();
  const pendingManual = reviewRecords.find((row) => row.id === 'crr_1');
  assert.ok(pendingManual);
  pendingManual.reviewStatus = CollectionContentReviewStatus.MANUAL_APPROVED;
  const service = new CollectionReviewsService(prisma as never);

  await assert.rejects(
    () => service.approveCollectionReview('crr_1', {}),
    (error: unknown) =>
      error instanceof BizError && error.code === 'REVIEW_STATUS_INVALID',
  );
});

test('CollectionReviewsService.rejectCollectionReview marks review rejected and unpublishes content', async () => {
  const { prisma, reviewRecords, contentVersions } = createCollectionReviewsPrismaMock();
  const service = new CollectionReviewsService(prisma as never);

  const result = await service.rejectCollectionReview('crr_1', {
    reason: '不符合公开展示规范',
  });

  assert.equal(result.reviewId, 'crr_1');
  assert.equal(result.reviewStatus, CollectionContentReviewStatus.MANUAL_REJECTED);
  assert.equal(result.publishStatus, CollectionContentPublishStatus.UNPUBLISHED);
  assert.ok(result.reviewedAt);
  const afterReject = reviewRecords.find((row) => row.id === 'crr_1');
  assert.equal(
    afterReject?.reviewStatus,
    CollectionContentReviewStatus.MANUAL_REJECTED,
  );
  assert.equal(afterReject?.reviewSource, CollectionContentReviewSource.ADMIN);
  assert.equal(afterReject?.reviewReason, '不符合公开展示规范');
  assert.equal(contentVersions[0]?.editStatus, CollectionContentEditStatus.REJECTED);
  assert.equal(
    contentVersions[0]?.publishStatus,
    CollectionContentPublishStatus.UNPUBLISHED,
  );
});

test('CollectionReviewsService.rejectCollectionReview rejects empty reason', async () => {
  const { prisma } = createCollectionReviewsPrismaMock();
  const service = new CollectionReviewsService(prisma as never);

  await assert.rejects(
    () => service.rejectCollectionReview('crr_1', { reason: '   ' }),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'VALIDATION_ERROR' &&
      error.message.includes('reason'),
  );
});

test('CollectionReviewsService.rejectCollectionReview rejects missing review record', async () => {
  const { prisma } = createCollectionReviewsPrismaMock();
  const service = new CollectionReviewsService(prisma as never);

  await assert.rejects(
    () =>
      service.rejectCollectionReview('missing_review', {
        reason: '不符合公开展示规范',
      }),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'REVIEW_RECORD_NOT_FOUND' &&
      error.status === 404,
  );
});

test('CollectionReviewsService.rejectCollectionReview rejects invalid review status', async () => {
  const { prisma, reviewRecords } = createCollectionReviewsPrismaMock();
  const pendingManual = reviewRecords.find((row) => row.id === 'crr_1');
  assert.ok(pendingManual);
  pendingManual.reviewStatus = CollectionContentReviewStatus.MANUAL_APPROVED;
  const service = new CollectionReviewsService(prisma as never);

  await assert.rejects(
    () =>
      service.rejectCollectionReview('crr_1', {
        reason: '不符合公开展示规范',
      }),
    (error: unknown) =>
      error instanceof BizError && error.code === 'REVIEW_STATUS_INVALID',
  );
});

test('CollectionReviewsService.listCollectionReviewHistory rejects missing collectionNo', async () => {
  const { prisma } = createCollectionReviewsPrismaMock();
  const service = new CollectionReviewsService(prisma as never);

  await assert.rejects(
    () => service.listCollectionReviewHistory({}),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'VALIDATION_ERROR' &&
      error.message.includes('collectionNo'),
  );
});

test('CollectionReviewsService.listCollectionReviewHistory returns 404 when collection not found', async () => {
  const { prisma } = createCollectionReviewsPrismaMock();
  const service = new CollectionReviewsService(prisma as never);

  await assert.rejects(
    () => service.listCollectionReviewHistory({ collectionNo: 'COL-404' }),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'COLLECTION_NOT_FOUND' &&
      error.status === 404,
  );
});

test('CollectionReviewsService.listCollectionReviewHistory returns ascending records for a collection', async () => {
  const { prisma } = createCollectionReviewsPrismaMock();
  const service = new CollectionReviewsService(prisma as never);

  const result = await service.listCollectionReviewHistory({
    collectionNo: 'COL-001',
  });

  assert.equal(result.items.length, 2);
  assert.equal(result.items[0]?.reviewId, 'crr_0');
  assert.equal(result.items[0]?.reviewStatus, CollectionContentReviewStatus.MACHINE_APPROVED);
  assert.equal(result.items[1]?.reviewId, 'crr_1');
  assert.equal(result.items[1]?.reviewStatus, CollectionContentReviewStatus.PENDING_MANUAL);
});

test('CollectionReviewsService.listCollectionReviewHistory supports filtering by content version', async () => {
  const { prisma } = createCollectionReviewsPrismaMock();
  const service = new CollectionReviewsService(prisma as never);

  const result = await service.listCollectionReviewHistory({
    collectionNo: 'COL-001',
    contentVersionId: 'ccv_2',
  });

  assert.equal(result.items.length, 2);
  assert.equal(result.items[0]?.contentVersionId, 'ccv_2');
  assert.equal(result.items[1]?.contentVersionId, 'ccv_2');
});

test('CollectionReviewsService.listCollectionReviewHistory rejects when result exceeds max records', async () => {
  const { prisma, reviewRecords } = createCollectionReviewsPrismaMock();
  for (let i = 0; i < 205; i += 1) {
    reviewRecords.push({
      id: `crr_limit_${i}`,
      collectionId: 'col_1',
      contentVersionId: 'ccv_2',
      reviewStage: CollectionContentReviewStage.MANUAL,
      reviewStatus: CollectionContentReviewStatus.PENDING_MANUAL,
      reviewSource: CollectionContentReviewSource.SYSTEM,
      reviewReason: null,
      reviewedByAdminUserId: null,
      reviewedAt: null,
      createdAt: new Date(`2026-05-15T06:${String(i % 60).padStart(2, '0')}:00.000Z`),
      collection: {
        id: 'col_1',
        collectionNo: 'COL-001',
        seriesId: 'ser_1',
        batchId: 'bat_1',
      },
      contentVersion: {
        id: 'ccv_2',
        versionNo: 2,
        submittedAt: new Date('2026-05-14T04:30:00.000Z'),
      },
    });
  }
  const service = new CollectionReviewsService(prisma as never);

  await assert.rejects(
    () => service.listCollectionReviewHistory({ collectionNo: 'COL-001' }),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'REVIEW_HISTORY_LIMIT_EXCEEDED' &&
      error.status === 400,
  );
});

test('CollectionReviewsService.listCollectionReviewHistory rejects version not belonging to collection', async () => {
  const { prisma } = createCollectionReviewsPrismaMock();
  const service = new CollectionReviewsService(prisma as never);

  await assert.rejects(
    () =>
      service.listCollectionReviewHistory({
        collectionNo: 'COL-002',
        contentVersionId: 'ccv_2',
      }),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'CONTENT_VERSION_NOT_FOUND' &&
      error.status === 404,
  );
});

function createTakedownPrismaMock(options: {
  id?: string;
  editStatus?: CollectionContentEditStatus;
  initialPublishStatus: CollectionContentPublishStatus;
}) {
  const id = options.id ?? 'ccv_td';
  let publishStatus = options.initialPublishStatus;
  const editStatus = options.editStatus ?? CollectionContentEditStatus.APPROVED;

  const prisma = {
    collectionContentVersion: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (where.id !== id) {
          return null;
        }
        return {
          id,
          collectionId: 'col_1',
          versionNo: 3,
          editStatus,
          publishStatus,
          collection: { collectionNo: 'COL-TD' },
        };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { publishStatus: CollectionContentPublishStatus };
      }) => {
        publishStatus = data.publishStatus;
        return { id: where.id, publishStatus };
      },
    },
  };

  return { prisma, getPublishStatus: () => publishStatus };
}

test('CollectionReviewsService.takedownPublishedContentVersion sets TAKEDOWN on published version', async () => {
  const { prisma, getPublishStatus } = createTakedownPrismaMock({
    initialPublishStatus: CollectionContentPublishStatus.PUBLISHED,
  });
  const service = new CollectionReviewsService(prisma as never);

  const result = await service.takedownPublishedContentVersion('ccv_td', {});

  assert.equal(result.publishStatus, 'TAKEDOWN');
  assert.equal(result.collectionNo, 'COL-TD');
  assert.equal(getPublishStatus(), CollectionContentPublishStatus.TAKEDOWN);
  assert.ok(result.appliedAt > 0);
});

test('CollectionReviewsService.takedownPublishedContentVersion rejects missing version', async () => {
  const { prisma } = createTakedownPrismaMock({
    id: 'ccv_td',
    initialPublishStatus: CollectionContentPublishStatus.PUBLISHED,
  });
  const service = new CollectionReviewsService(prisma as never);

  await assert.rejects(
    () => service.takedownPublishedContentVersion('other', {}),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'CONTENT_VERSION_NOT_FOUND' &&
      error.status === 404,
  );
});

test('CollectionReviewsService.takedownPublishedContentVersion rejects when already TAKEDOWN', async () => {
  const { prisma } = createTakedownPrismaMock({
    initialPublishStatus: CollectionContentPublishStatus.TAKEDOWN,
  });
  const service = new CollectionReviewsService(prisma as never);

  await assert.rejects(
    () => service.takedownPublishedContentVersion('ccv_td', {}),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'TAKEDOWN_STATUS_INVALID' &&
      error.status === 400,
  );
});

test('CollectionReviewsService.takedownPublishedContentVersion rejects when not published', async () => {
  const { prisma } = createTakedownPrismaMock({
    initialPublishStatus: CollectionContentPublishStatus.UNPUBLISHED,
  });
  const service = new CollectionReviewsService(prisma as never);

  await assert.rejects(
    () => service.takedownPublishedContentVersion('ccv_td', {}),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'TAKEDOWN_STATUS_INVALID' &&
      error.status === 400,
  );
});

test('CollectionReviewsService.takedownPublishedContentVersion rejects when not approved', async () => {
  const { prisma } = createTakedownPrismaMock({
    initialPublishStatus: CollectionContentPublishStatus.PUBLISHED,
    editStatus: CollectionContentEditStatus.DRAFT,
  });
  const service = new CollectionReviewsService(prisma as never);

  await assert.rejects(
    () => service.takedownPublishedContentVersion('ccv_td', {}),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'TAKEDOWN_STATUS_INVALID' &&
      error.status === 400,
  );
});
