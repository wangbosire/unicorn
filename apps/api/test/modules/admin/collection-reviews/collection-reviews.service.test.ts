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
    };
    contentVersion: {
      id: string;
      versionNo: number;
      submittedAt: Date | null;
      editStatus?: CollectionContentEditStatus;
      publishStatus?: CollectionContentPublishStatus;
      publishedAt?: Date | null;
    };
  }> = [
    {
      id: 'crr_1',
      collectionId: 'col_1',
      contentVersionId: 'ccv_2',
      reviewStage: CollectionContentReviewStage.MANUAL,
      reviewStatus: CollectionContentReviewStatus.PENDING_MANUAL,
      reviewSource: CollectionContentReviewSource.SYSTEM,
      reviewReason: null,
      reviewedByAdminUserId: null,
      reviewedAt: null,
      createdAt: new Date('2026-05-14T05:00:00.000Z'),
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
      },
      contentVersion: {
        id: 'ccv_3',
        versionNo: 1,
        submittedAt: new Date('2026-05-14T05:40:00.000Z'),
      },
    },
  ];

  const contentVersions = [
    {
      id: 'ccv_2',
      versionNo: 2,
      submittedAt: new Date('2026-05-14T04:30:00.000Z'),
      editStatus: CollectionContentEditStatus.UNDER_REVIEW,
      publishStatus: CollectionContentPublishStatus.UNPUBLISHED,
      publishedAt: null as Date | null,
    },
    {
      id: 'ccv_3',
      versionNo: 1,
      submittedAt: new Date('2026-05-14T05:40:00.000Z'),
      editStatus: CollectionContentEditStatus.UNDER_REVIEW,
      publishStatus: CollectionContentPublishStatus.UNPUBLISHED,
      publishedAt: null as Date | null,
    },
  ];

  const collectionContentReviewRecord = {
    findMany: async ({
      where,
      skip,
      take,
    }: {
      where: {
        reviewStatus?: CollectionContentReviewStatus;
        collection?: {
          seriesId?: string;
          batchId?: string;
        };
      };
      skip: number;
      take: number;
    }) => {
      const filteredItems = reviewRecords.filter((item) => {
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

        return true;
      });

      return filteredItems
        .slice()
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .slice(skip, skip + take);
    },
    count: async ({
      where,
    }: {
      where: {
        reviewStatus?: CollectionContentReviewStatus;
        collection?: {
          seriesId?: string;
          batchId?: string;
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
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: {
        editStatus: CollectionContentEditStatus;
        publishStatus: CollectionContentPublishStatus;
        publishedAt: Date;
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

  assert.equal(result.total, 2);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0]?.reviewId, 'crr_2');
  assert.equal(result.items[0]?.collectionNo, 'COL-002');
  assert.equal(result.items[1]?.reviewStatus, CollectionContentReviewStatus.PENDING_MANUAL);
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
  assert.equal(
    reviewRecords[0]?.reviewStatus,
    CollectionContentReviewStatus.MANUAL_APPROVED,
  );
  assert.equal(reviewRecords[0]?.reviewSource, CollectionContentReviewSource.ADMIN);
  assert.equal(reviewRecords[0]?.reviewReason, '人工审核通过');
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

test('CollectionReviewsService.approveCollectionReview rejects invalid review status', async () => {
  const { prisma, reviewRecords } = createCollectionReviewsPrismaMock();
  reviewRecords[0]!.reviewStatus = CollectionContentReviewStatus.MANUAL_APPROVED;
  const service = new CollectionReviewsService(prisma as never);

  await assert.rejects(
    () => service.approveCollectionReview('crr_1', {}),
    (error: unknown) =>
      error instanceof BizError && error.code === 'REVIEW_STATUS_INVALID',
  );
});
