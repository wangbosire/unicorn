import * as assert from 'node:assert/strict';
import { CollectionCommentStatus, CollectionCommentReviewSource } from '@prisma/client';
import { test } from 'vitest';
import { BizError } from '../../../../src/common/http/biz-error';
import { CollectionCommentsService } from '../../../../src/modules/admin/collection-comments/collection-comments.service';

function createAdminCollectionCommentsPrismaMock() {
  const comments: Array<{
    id: string;
    collectionId: string;
    contentVersionId: string;
    memberId: string;
    parentCommentId: string | null;
    rootCommentId: string | null;
    content: string;
    status: CollectionCommentStatus;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    collection: {
      collectionNo: string;
      series: { seriesNo: string; name: string };
      batch: { batchNo: string; name: string };
    };
    contentVersion: { versionNo: number };
    member: { id: string; memberNo: string; nickname: string };
    replies: Array<{ id: string }>;
    reviewRecords: Array<{
      reviewSource: CollectionCommentReviewSource;
      reviewReason: string | null;
      createdAt: Date;
    }>;
  }> = [
    {
      id: 'cmt_1',
      collectionId: 'col_1',
      contentVersionId: 'ccv_1',
      memberId: 'mem_1',
      parentCommentId: null,
      rootCommentId: null,
      content: '评论一',
      status: CollectionCommentStatus.PENDING_MANUAL,
      publishedAt: null,
      createdAt: new Date('2026-05-18T10:00:00.000Z'),
      updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      collection: {
        collectionNo: 'COL-001',
        series: { seriesNo: 'SER-001', name: '星辉远征' },
        batch: { batchNo: 'BAT-001', name: '首发批次' },
      },
      contentVersion: { versionNo: 1 },
      member: { id: 'mem_1', memberNo: 'MEM-001', nickname: '会员甲' },
      replies: [{ id: 'cmt_2' }],
      reviewRecords: [
        {
          reviewSource: CollectionCommentReviewSource.SYSTEM,
          reviewReason: '待人工审核',
          createdAt: new Date('2026-05-18T10:00:00.000Z'),
        },
      ],
    },
    {
      id: 'cmt_2',
      collectionId: 'col_1',
      contentVersionId: 'ccv_1',
      memberId: 'mem_2',
      parentCommentId: 'cmt_1',
      rootCommentId: 'cmt_1',
      content: '评论二',
      status: CollectionCommentStatus.MANUAL_APPROVED,
      publishedAt: new Date('2026-05-18T10:05:00.000Z'),
      createdAt: new Date('2026-05-18T10:05:00.000Z'),
      updatedAt: new Date('2026-05-18T10:05:00.000Z'),
      collection: {
        collectionNo: 'COL-001',
        series: { seriesNo: 'SER-001', name: '星辉远征' },
        batch: { batchNo: 'BAT-001', name: '首发批次' },
      },
      contentVersion: { versionNo: 1 },
      member: { id: 'mem_2', memberNo: 'MEM-002', nickname: '会员乙' },
      replies: [],
      reviewRecords: [
        {
          reviewSource: CollectionCommentReviewSource.ADMIN,
          reviewReason: '审核通过',
          createdAt: new Date('2026-05-18T10:05:00.000Z'),
        },
      ],
    },
  ];

  const createdReviewRecords: Array<Record<string, unknown>> = [];

  const prisma = {
    collectionComment: {
      findMany: async ({
        where,
        skip,
        take,
      }: {
        where: {
          status?: CollectionCommentStatus;
          collection?: { collectionNo: string };
        };
        skip: number;
        take: number;
      }) =>
        comments
          .filter((item) => {
            if (where.status && item.status !== where.status) {
              return false;
            }
            if (
              where.collection?.collectionNo &&
              item.collection.collectionNo !== where.collection.collectionNo
            ) {
              return false;
            }
            return true;
          })
          .slice(skip, skip + take),
      count: async ({
        where,
      }: {
        where: {
          status?: CollectionCommentStatus;
          collection?: { collectionNo: string };
        };
      }) =>
        comments.filter((item) => {
          if (where.status && item.status !== where.status) {
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
      findUnique: async ({ where }: { where: { id: string } }) =>
        comments.find((item) => item.id === where.id) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { status: CollectionCommentStatus; publishedAt: Date | null };
      }) => {
        const target = comments.find((item) => item.id === where.id);
        assert.ok(target);
        target.status = data.status;
        target.publishedAt = data.publishedAt;
        return target;
      },
    },
    collectionCommentReviewRecord: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdReviewRecords.push(data);
        return data;
      },
    },
    $transaction: async (arg: unknown) => {
      if (typeof arg === 'function') {
        return arg(prisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    },
  };

  return { prisma, comments, createdReviewRecords };
}

test('CollectionCommentsService.listCollectionComments returns paginated list', async () => {
  const { prisma } = createAdminCollectionCommentsPrismaMock();
  const service = new CollectionCommentsService(prisma as never);

  const result = await service.listCollectionComments({
    page: '1',
    pageSize: '10',
    collectionNo: 'COL-001',
  });

  assert.equal(result.total, 2);
  assert.equal(result.items[0]?.commentId, 'cmt_1');
  assert.equal(result.items[0]?.seriesNo, 'SER-001');
  assert.equal(result.items[0]?.batchNo, 'BAT-001');
  assert.equal(result.items[0]?.contentVersionNo, 1);
  assert.equal(result.items[0]?.memberNo, 'MEM-001');
  assert.equal(result.items[0]?.isRootComment, true);
  assert.equal(result.items[0]?.replyCount, 1);
});

test('CollectionCommentsService.listCollectionCommentReviews filters by review status', async () => {
  const { prisma } = createAdminCollectionCommentsPrismaMock();
  const service = new CollectionCommentsService(prisma as never);

  const result = await service.listCollectionCommentReviews({
    page: '1',
    pageSize: '10',
    reviewStatus: 'PENDING_MANUAL',
  });

  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.commentId, 'cmt_1');
  assert.equal(result.items[0]?.seriesNo, 'SER-001');
  assert.equal(result.items[0]?.memberNo, 'MEM-001');
  assert.equal(result.items[0]?.isRootComment, true);
});

test('CollectionCommentsService.approveCollectionComment updates comment and creates review record', async () => {
  const { prisma, comments, createdReviewRecords } =
    createAdminCollectionCommentsPrismaMock();
  const service = new CollectionCommentsService(prisma as never);

  const result = await service.approveCollectionComment('cmt_1', {
    comment: '人工通过',
  });

  assert.equal(result.status, 'MANUAL_APPROVED');
  assert.equal(comments[0]?.status, CollectionCommentStatus.MANUAL_APPROVED);
  assert.equal(createdReviewRecords.length, 1);
});

test('CollectionCommentsService.rejectCollectionComment updates comment and creates review record', async () => {
  const { prisma, comments, createdReviewRecords } =
    createAdminCollectionCommentsPrismaMock();
  const service = new CollectionCommentsService(prisma as never);

  const result = await service.rejectCollectionComment('cmt_1', {
    reason: '违规',
  });

  assert.equal(result.status, 'MANUAL_REJECTED');
  assert.equal(comments[0]?.status, CollectionCommentStatus.MANUAL_REJECTED);
  assert.equal(createdReviewRecords.length, 1);
});

test('CollectionCommentsService.blockCollectionComment blocks approved comment and creates review record', async () => {
  const { prisma, comments, createdReviewRecords } =
    createAdminCollectionCommentsPrismaMock();
  const service = new CollectionCommentsService(prisma as never);

  const result = await service.blockCollectionComment('cmt_2', {
    reason: '运营屏蔽',
  });

  assert.equal(result.status, 'BLOCKED');
  assert.equal(comments[1]?.status, CollectionCommentStatus.BLOCKED);
  assert.equal(comments[1]?.publishedAt, null);
  assert.equal(createdReviewRecords.length, 1);
});

test('CollectionCommentsService.approveCollectionComment rejects invalid status', async () => {
  const { prisma } = createAdminCollectionCommentsPrismaMock();
  const service = new CollectionCommentsService(prisma as never);

  await assert.rejects(
    () => service.approveCollectionComment('cmt_2', {}),
    (error: unknown) =>
      error instanceof BizError && error.code === 'COMMENT_REVIEW_STATUS_INVALID',
  );
});

test('CollectionCommentsService.blockCollectionComment rejects invalid status', async () => {
  const { prisma } = createAdminCollectionCommentsPrismaMock();
  const service = new CollectionCommentsService(prisma as never);

  await assert.rejects(
    () => service.blockCollectionComment('cmt_1', {}),
    (error: unknown) =>
      error instanceof BizError && error.code === 'COMMENT_BLOCK_STATUS_INVALID',
  );
});
