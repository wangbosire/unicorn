import * as assert from 'node:assert/strict';
import { CollectionCommentStatus } from '@prisma/client';
import { test } from 'vitest';
import { BizError } from '../../../../src/common/http/biz-error';
import { PublicCollectionCommentsService } from '../../../../src/modules/public/collection-comments/public-collection-comments.service';

function createPublicCollectionCommentsPrismaMock() {
  const prisma = {
    collection: {
      findUnique: async ({
        where,
      }: {
        where: { collectionNo: string };
        select?: unknown;
      }) =>
        where.collectionNo === 'COL-001'
          ? {
              id: 'col_1',
              collectionNo: 'COL-001',
            }
          : null,
    },
    collectionComment: {
      findMany: async () => [
        {
          id: 'cmt_1',
          content: '一级评论',
          publishedAt: new Date('2026-05-18T10:00:00.000Z'),
          createdAt: new Date('2026-05-18T10:00:00.000Z'),
          status: CollectionCommentStatus.MANUAL_APPROVED,
          member: {
            nickname: '评论者A',
            avatarUrl: 'https://example.com/a.png',
          },
          replies: [
            {
              id: 'cmt_2',
              rootCommentId: 'cmt_1',
              content: '二级回复',
              publishedAt: new Date('2026-05-18T10:05:00.000Z'),
              createdAt: new Date('2026-05-18T10:05:00.000Z'),
              member: {
                nickname: '评论者B',
                avatarUrl: null,
              },
            },
          ],
        },
      ],
    },
  };

  return { prisma };
}

test('PublicCollectionCommentsService.listPublicCollectionCommentsBySlug returns published comments', async () => {
  const { prisma } = createPublicCollectionCommentsPrismaMock();
  const service = new PublicCollectionCommentsService(prisma as never);

  const result = await service.listPublicCollectionCommentsBySlug('COL-001');

  assert.equal(result.collectionNo, 'COL-001');
  assert.equal(result.topLevelCommentCount, 1);
  assert.equal(result.totalCommentCount, 2);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.memberAvatarUrl, 'https://example.com/a.png');
  assert.equal(result.items[0]?.replyCount, 1);
  assert.equal(result.items[0]?.replies.length, 1);
  assert.equal(result.items[0]?.replies[0]?.rootCommentId, 'cmt_1');
});

test('PublicCollectionCommentsService.listPublicCollectionCommentsBySlug throws when collection missing', async () => {
  const { prisma } = createPublicCollectionCommentsPrismaMock();
  const service = new PublicCollectionCommentsService(prisma as never);

  await assert.rejects(
    () => service.listPublicCollectionCommentsBySlug('missing'),
    (error: unknown) =>
      error instanceof BizError && error.code === 'RESOURCE_NOT_FOUND',
  );
});
