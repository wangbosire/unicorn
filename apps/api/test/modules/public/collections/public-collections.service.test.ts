import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  CollectionCommentStatus,
  CollectionContentEditStatus,
  CollectionContentPublishStatus,
  CollectionStatus,
  MemberStatus,
} from '@prisma/client';
import { PublicCollectionsService } from '../../../../src/modules/public/collections/public-collections.service';
import { BizError } from '../../../../src/common/http/biz-error';

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

function buildApprovedVersionRow(params: {
  id: string;
  versionNo: number;
  publishStatus: CollectionContentPublishStatus;
  publishedAt: Date | null;
  title?: string;
}) {
  const title = params.title ?? '公开标题';
  return {
    id: params.id,
    collectionId: 'col_1',
    versionNo: params.versionNo,
    title,
    summary: '公开摘要',
    coverImageUrl: null,
    contentPayload: { blocks: [] } as Record<string, unknown>,
    editStatus: CollectionContentEditStatus.APPROVED,
    publishStatus: params.publishStatus,
    submittedAt: new Date('2026-05-14T11:00:00.000Z'),
    publishedAt: params.publishedAt,
    createdByMemberId: member.id,
    createdAt: new Date('2026-05-14T01:00:00.000Z'),
    updatedAt: new Date('2026-05-14T12:00:00.000Z'),
  };
}

function createPrismaMock(overrides: {
  /** `null`：无已审核版本；未传：默认一条已发布版本。 */
  approvedVersions?: ReturnType<typeof buildApprovedVersionRow>[] | null;
} = {}) {
  const approvedVersions =
    overrides.approvedVersions === undefined
      ? [
          buildApprovedVersionRow({
            id: 'ccv_1',
            versionNo: 1,
            publishStatus: CollectionContentPublishStatus.PUBLISHED,
            publishedAt: new Date('2026-05-14T12:00:00.000Z'),
          }),
        ]
      : overrides.approvedVersions === null
        ? []
        : overrides.approvedVersions;

  const prisma = {
    collection: {
      findUnique: async ({ where }: { where: { collectionNo: string } }) => {
        if (where.collectionNo !== 'COL-PUB-1') {
          return null;
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
          series: {
            id: 'ser_1',
            seriesNo: 'SER-001',
            name: '星辉远征',
          },
          batch: {
            id: 'bat_1',
            batchNo: 'BAT-001',
            name: '首发批次',
          },
          currentOwnerMember: member,
          contentVersions: approvedVersions,
        };
      },
    },
    collectionComment: {
      count: async ({
        where,
      }: {
        where: {
          collectionId: string;
          parentCommentId?: null;
          status: {
            in: CollectionCommentStatus[];
          };
        };
      }) => {
        assert.equal(where.collectionId, 'col_1');
        assert.deepEqual(where.status.in, [
          CollectionCommentStatus.MACHINE_APPROVED,
          CollectionCommentStatus.MANUAL_APPROVED,
        ]);

        return where.parentCommentId === null ? 2 : 5;
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
  assert.equal(result.seriesNo, 'SER-001');
  assert.equal(result.batchNo, 'BAT-001');
  assert.equal(result.contentVersionId, 'ccv_1');
  assert.equal(result.versionNo, 1);
  assert.equal(result.title, '公开标题');
  assert.equal(result.owner.memberNo, 'MEM-001');
  assert.equal(result.owner.nickname, '展示用户');
  assert.equal(result.owner.avatarUrl, null);
  assert.equal(result.topLevelCommentCount, 2);
  assert.equal(result.totalCommentCount, 5);
  assert.ok(result.publishedAt.includes('2026-05-14'));
});

test('PublicCollectionsService.getPublicCollectionBySlug throws when not published', async () => {
  const { prisma } = createPrismaMock({ approvedVersions: null });
  const service = new PublicCollectionsService(prisma as never);

  await assert.rejects(
    () => service.getPublicCollectionBySlug('COL-PUB-1'),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'RESOURCE_NOT_FOUND' &&
      error.status === 404,
  );
});

test('PublicCollectionsService.getPublicCollectionBySlug returns 410 when latest approved is TAKEDOWN', async () => {
  const { prisma } = createPrismaMock({
    approvedVersions: [
      buildApprovedVersionRow({
        id: 'ccv_2',
        versionNo: 2,
        publishStatus: CollectionContentPublishStatus.TAKEDOWN,
        publishedAt: new Date('2026-05-14T13:00:00.000Z'),
      }),
      buildApprovedVersionRow({
        id: 'ccv_1',
        versionNo: 1,
        publishStatus: CollectionContentPublishStatus.PUBLISHED,
        publishedAt: new Date('2026-05-14T12:00:00.000Z'),
      }),
    ],
  });
  const service = new PublicCollectionsService(prisma as never);

  await assert.rejects(
    () => service.getPublicCollectionBySlug('COL-PUB-1'),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'PUBLIC_COLLECTION_TAKEDOWN' &&
      error.status === 410,
  );
});

test('PublicCollectionsService.getPublicCollectionBySlug returns older published when latest is UNPUBLISHED', async () => {
  const { prisma } = createPrismaMock({
    approvedVersions: [
      buildApprovedVersionRow({
        id: 'ccv_2',
        versionNo: 2,
        publishStatus: CollectionContentPublishStatus.UNPUBLISHED,
        publishedAt: null,
      }),
      buildApprovedVersionRow({
        id: 'ccv_1',
        versionNo: 1,
        title: '仍公开的一版',
        publishStatus: CollectionContentPublishStatus.PUBLISHED,
        publishedAt: new Date('2026-05-14T12:00:00.000Z'),
      }),
    ],
  });
  const service = new PublicCollectionsService(prisma as never);

  const result = await service.getPublicCollectionBySlug('COL-PUB-1');
  assert.equal(result.title, '仍公开的一版');
});

test('PublicCollectionsService.getPublicCollectionStatsBySlug returns summary', async () => {
  const { prisma } = createPrismaMock({
    approvedVersions: [
      buildApprovedVersionRow({
        id: 'ccv_2',
        versionNo: 2,
        publishStatus: CollectionContentPublishStatus.UNPUBLISHED,
        publishedAt: null,
      }),
      buildApprovedVersionRow({
        id: 'ccv_1',
        versionNo: 1,
        publishStatus: CollectionContentPublishStatus.PUBLISHED,
        publishedAt: new Date('2026-05-14T12:00:00.000Z'),
      }),
    ],
  });
  const service = new PublicCollectionsService(prisma as never);

  const result = await service.getPublicCollectionStatsBySlug('COL-PUB-1');

  assert.equal(result.collectionNo, 'COL-PUB-1');
  assert.equal(result.ownerMemberNo, 'MEM-001');
  assert.equal(result.ownerNickname, '展示用户');
  assert.equal(result.approvedVersionCount, 2);
  assert.equal(result.hasPublishedContent, true);
  assert.equal(result.latestApprovedVersionNo, 2);
  assert.equal(result.publishedVersionNo, 1);
  assert.equal(result.topLevelCommentCount, 2);
  assert.equal(result.totalCommentCount, 5);
  assert.ok(result.publishedAt?.includes('2026-05-14'));
});

test('PublicCollectionsService.getPublicCollectionStatsBySlug throws when collection missing', async () => {
  const { prisma } = createPrismaMock();
  const service = new PublicCollectionsService(prisma as never);

  await assert.rejects(
    () => service.getPublicCollectionStatsBySlug('missing'),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'RESOURCE_NOT_FOUND' &&
      error.status === 404,
  );
});
