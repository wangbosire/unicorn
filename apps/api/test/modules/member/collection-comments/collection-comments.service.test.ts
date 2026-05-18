import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  CollectionCommentStatus,
  CollectionContentEditStatus,
  CollectionContentPublishStatus,
  MemberStatus,
} from '@prisma/client';
import { BizError } from '../../../../src/common/http/biz-error';
import { MemberContextService } from '../../../../src/modules/member/auth/member-context.service';
import { CollectionCommentsService } from '../../../../src/modules/member/collection-comments/collection-comments.service';

function createCollectionCommentsPrismaMock() {
  const member = {
    id: 'mem_1',
    memberNo: 'MEM-001',
    nickname: '评论会员',
    avatarUrl: null,
    mobile: null,
    status: MemberStatus.ACTIVE,
    registeredAt: new Date('2026-05-18T08:00:00.000Z'),
    createdAt: new Date('2026-05-18T08:00:00.000Z'),
    updatedAt: new Date('2026-05-18T08:00:00.000Z'),
  };

  const contentVersion = {
    id: 'ccv_pub_1',
    collectionId: 'col_1',
    versionNo: 1,
    title: '公开内容',
    summary: '公开摘要',
    coverImageUrl: null,
    contentPayload: {},
    editStatus: CollectionContentEditStatus.APPROVED,
    publishStatus: CollectionContentPublishStatus.PUBLISHED,
    submittedAt: new Date('2026-05-18T08:00:00.000Z'),
    publishedAt: new Date('2026-05-18T09:00:00.000Z'),
    createdByMemberId: 'mem_1',
    createdAt: new Date('2026-05-18T08:00:00.000Z'),
    updatedAt: new Date('2026-05-18T09:00:00.000Z'),
  };

  const comments: Array<Record<string, unknown>> = [
    {
      id: 'cmt_root_1',
      collectionId: 'col_1',
      contentVersionId: 'ccv_pub_1',
      memberId: 'mem_1',
      parentCommentId: null,
      rootCommentId: null,
      content: '根评论',
      status: CollectionCommentStatus.MANUAL_APPROVED,
      publishedAt: new Date('2026-05-18T10:00:00.000Z'),
      createdAt: new Date('2026-05-18T10:00:00.000Z'),
      updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      collection: { id: 'col_1', collectionNo: 'COL-001' },
      contentVersion,
    },
  ];

  const reviewRecords: Array<Record<string, unknown>> = [];

  const prisma = {
    member: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === member.id ? member : null,
    },
    collection: {
      findUnique: async ({ where }: { where: { collectionNo: string } }) =>
        where.collectionNo === 'COL-001'
          ? {
              id: 'col_1',
              collectionNo: 'COL-001',
              contentVersions: [contentVersion],
            }
          : null,
    },
    collectionComment: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        (comments.find((item) => item.id === where.id) as Record<string, unknown>) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const createdAt = new Date('2026-05-18T11:00:00.000Z');
        const record = {
          id: `cmt_${comments.length + 1}`,
          ...data,
          createdAt,
          updatedAt: createdAt,
        };
        comments.push(record);
        return record;
      },
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
      findMany: async () => comments,
    },
    collectionCommentReviewRecord: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        reviewRecords.push(data);
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

  return { prisma, comments, reviewRecords };
}

test('CollectionCommentsService.createCollectionComment creates published comment and review record', async () => {
  const { prisma, comments, reviewRecords } = createCollectionCommentsPrismaMock();
  const memberContextService = new MemberContextService(prisma as never);
  const service = new CollectionCommentsService(
    prisma as never,
    memberContextService,
  );

  const result = await service.createCollectionComment(
    { memberId: 'mem_1' },
    {
      collectionNo: 'COL-001',
      content: '新的评论',
    },
  );

  assert.equal(result.status, CollectionCommentStatus.MACHINE_APPROVED);
  assert.equal(result.collectionNo, 'COL-001');
  assert.equal(result.contentVersionId, 'ccv_pub_1');
  assert.equal(result.reviewReason, null);
  assert.ok(typeof result.publishedAt === 'number');
  assert.equal(comments.length, 2);
  assert.equal(reviewRecords.length, 1);
});

test('CollectionCommentsService.replyCollectionComment creates second-level reply', async () => {
  const { prisma, comments, reviewRecords } = createCollectionCommentsPrismaMock();
  const memberContextService = new MemberContextService(prisma as never);
  const service = new CollectionCommentsService(
    prisma as never,
    memberContextService,
  );

  const result = await service.replyCollectionComment(
    { memberId: 'mem_1' },
    { commentId: 'cmt_root_1' },
    { content: '回复内容' },
  );

  assert.equal(result.parentCommentId, 'cmt_root_1');
  assert.equal(result.rootCommentId, 'cmt_root_1');
  assert.equal(result.status, CollectionCommentStatus.MACHINE_APPROVED);
  assert.equal(result.collectionNo, 'COL-001');
  assert.equal(result.contentVersionId, 'ccv_pub_1');
  assert.equal(result.reviewReason, null);
  assert.ok(typeof result.publishedAt === 'number');
  assert.equal(comments.length, 2);
  assert.equal(reviewRecords.length, 1);
});

test('CollectionCommentsService.createCollectionComment enters pending manual when sentinel matched', async () => {
  const { prisma } = createCollectionCommentsPrismaMock();
  const memberContextService = new MemberContextService(prisma as never);
  const service = new CollectionCommentsService(
    prisma as never,
    memberContextService,
  );

  const result = await service.createCollectionComment(
    { memberId: 'mem_1' },
    {
      collectionNo: 'COL-001',
      content: '需要人工复核 __MANUAL_REVIEW__',
    },
  );

  assert.equal(result.status, CollectionCommentStatus.PENDING_MANUAL);
  assert.equal(
    result.reviewReason,
    'machine review escalated to manual review by sentinel',
  );
  assert.equal(result.publishedAt, null);
});

test('CollectionCommentsService.createCollectionComment rejects by machine sentinel', async () => {
  const { prisma } = createCollectionCommentsPrismaMock();
  const memberContextService = new MemberContextService(prisma as never);
  const service = new CollectionCommentsService(
    prisma as never,
    memberContextService,
  );

  const result = await service.createCollectionComment(
    { memberId: 'mem_1' },
    {
      collectionNo: 'COL-001',
      content: '机审驳回 __MACHINE_REJECT__',
    },
  );

  assert.equal(result.status, CollectionCommentStatus.MACHINE_REJECTED);
  assert.equal(result.reviewReason, 'machine review rejected by sentinel');
  assert.equal(result.publishedAt, null);
});

test('CollectionCommentsService.replyCollectionComment rejects missing parent comment', async () => {
  const { prisma } = createCollectionCommentsPrismaMock();
  const memberContextService = new MemberContextService(prisma as never);
  const service = new CollectionCommentsService(
    prisma as never,
    memberContextService,
  );

  await assert.rejects(
    () =>
      service.replyCollectionComment(
        { memberId: 'mem_1' },
        { commentId: 'missing' },
        { content: '回复内容' },
      ),
    (error: unknown) =>
      error instanceof BizError && error.code === 'COMMENT_NOT_FOUND',
  );
});
