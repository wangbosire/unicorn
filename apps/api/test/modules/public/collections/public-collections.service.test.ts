import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  CollectionContentEditStatus,
  CollectionContentPublishStatus,
  CollectionStatus,
  MemberStatus,
} from '@prisma/client';
import { PublicCollectionsService } from '../../../../src/modules/public/collections/public-collections.service';
import { BizError } from '../../../../src/common/http/biz-error';

function createPrismaMock(overrides: {
  publishedVersion?: {
    title: string;
    summary: string;
    coverImageUrl: string | null;
    contentPayload: Record<string, unknown>;
    publishedAt: Date;
  } | null;
} = {}) {
  const member = {
    id: 'mem_1',
    memberNo: 'MEM-001',
    nickname: '展示用户',
    avatarUrl: null,
    mobile: null,
    status: MemberStatus.ACTIVE,
    registeredAt: new Date('2026-05-14T00:00:00.000Z'),
    createdAt: new Date('2026-05-14T00:00:00.000Z'),
    updatedAt: new Date('2026-05-14T00:00:00.000Z'),
  };

  const published =
    overrides.publishedVersion === undefined
      ? {
          title: '公开标题',
          summary: '公开摘要',
          coverImageUrl: null,
          contentPayload: { blocks: [] },
          publishedAt: new Date('2026-05-14T12:00:00.000Z'),
        }
      : overrides.publishedVersion;

  const prisma = {
    collection: {
      findUnique: async ({ where }: { where: { collectionNo: string } }) => {
        if (where.collectionNo !== 'COL-PUB-1') {
          return null;
        }
        if (!published) {
          return {
            id: 'col_1',
            collectionNo: 'COL-PUB-1',
            seriesId: 'ser_1',
            batchId: 'bat_1',
            status: CollectionStatus.OWNED,
            currentOwnerMemberId: member.id,
            claimedAt: new Date('2026-05-14T01:00:00.000Z'),
            createdAt: new Date('2026-05-14T00:00:00.000Z'),
            updatedAt: new Date('2026-05-14T00:00:00.000Z'),
            currentOwnerMember: member,
            contentVersions: [],
          };
        }
        return {
          id: 'col_1',
          collectionNo: 'COL-PUB-1',
          seriesId: 'ser_1',
          batchId: 'bat_1',
          status: CollectionStatus.OWNED,
          currentOwnerMemberId: member.id,
          claimedAt: new Date('2026-05-14T01:00:00.000Z'),
          createdAt: new Date('2026-05-14T00:00:00.000Z'),
          updatedAt: new Date('2026-05-14T00:00:00.000Z'),
          currentOwnerMember: member,
          contentVersions: [
            {
              id: 'ccv_1',
              collectionId: 'col_1',
              versionNo: 1,
              title: published.title,
              summary: published.summary,
              coverImageUrl: published.coverImageUrl,
              contentPayload: published.contentPayload,
              editStatus: CollectionContentEditStatus.APPROVED,
              publishStatus: CollectionContentPublishStatus.PUBLISHED,
              submittedAt: new Date('2026-05-14T11:00:00.000Z'),
              publishedAt: published.publishedAt,
              createdByMemberId: member.id,
              createdAt: new Date('2026-05-14T01:00:00.000Z'),
              updatedAt: new Date('2026-05-14T12:00:00.000Z'),
            },
          ],
        };
      },
    },
  };

  return { prisma };
}

test('PublicCollectionsService.getPublicCollectionBySlug returns published snapshot', async () => {
  const { prisma } = createPrismaMock();
  const service = new PublicCollectionsService(prisma as never);

  const result = await service.getPublicCollectionBySlug('COL-PUB-1');

  assert.equal(result.collectionNo, 'COL-PUB-1');
  assert.equal(result.slug, 'COL-PUB-1');
  assert.equal(result.title, '公开标题');
  assert.equal(result.owner.memberNo, 'MEM-001');
  assert.equal(result.owner.nickname, '展示用户');
  assert.ok(result.publishedAt.includes('2026-05-14'));
});

test('PublicCollectionsService.getPublicCollectionBySlug throws when not published', async () => {
  const { prisma } = createPrismaMock({ publishedVersion: null });
  const service = new PublicCollectionsService(prisma as never);

  await assert.rejects(
    () => service.getPublicCollectionBySlug('COL-PUB-1'),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'RESOURCE_NOT_FOUND' &&
      error.status === 404,
  );
});
