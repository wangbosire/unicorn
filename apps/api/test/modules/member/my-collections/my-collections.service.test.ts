import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  CollectionContentReviewSource,
  CollectionContentReviewStage,
  CollectionContentReviewStatus,
  CollectionContentEditStatus,
  CollectionContentPublishStatus,
  CollectionStatus,
  MemberStatus,
} from '@prisma/client';
import { MemberContextService } from '../../../../src/modules/member/auth/member-context.service';
import { MyCollectionsService } from '../../../../src/modules/member/my-collections/my-collections.service';
import { BizError } from '../../../../src/common/http/biz-error';

function createMyCollectionsPrismaMock() {
  const member = {
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

  const collection = {
    id: 'col_1',
    collectionNo: 'COL-001',
    seriesId: 'ser_1',
    batchId: 'bat_1',
    status: CollectionStatus.OWNED,
    currentOwnerMemberId: member.id,
    claimedAt: new Date('2026-05-14T01:00:00.000Z'),
    createdAt: new Date('2026-05-14T00:00:00.000Z'),
    updatedAt: new Date('2026-05-14T01:00:00.000Z'),
  };

  const currentVersion: {
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
  } = {
    id: 'ccv_1',
    collectionId: collection.id,
    versionNo: 1,
    title: '我的第一件藏品',
    summary: '内容摘要',
    coverImageUrl: 'https://example.com/cover.png',
    contentPayload: {
      blocks: [],
    },
    editStatus: CollectionContentEditStatus.DRAFT,
    publishStatus: CollectionContentPublishStatus.UNPUBLISHED,
    submittedAt: null,
    publishedAt: null,
    createdByMemberId: member.id,
    createdAt: new Date('2026-05-14T01:00:00.000Z'),
    updatedAt: new Date('2026-05-14T01:00:00.000Z'),
  };

  const versions: Array<{
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
  }> = [{ ...currentVersion }];

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
  }> = [];

  const collectionContentVersion = {
      findUnique: async ({ where }: { where: { id: string } }) =>
        versions.find((item) => item.id === where.id) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data:
          | {
              title: string;
              summary: string;
              coverImageUrl: string | null;
              contentPayload: Record<string, unknown>;
              editStatus: CollectionContentEditStatus;
              publishStatus: CollectionContentPublishStatus;
              submittedAt: null;
            }
          | {
              editStatus: CollectionContentEditStatus;
              submittedAt: Date;
            };
      }) => {
        const targetVersion = versions.find((item) => item.id === where.id);

        if (!targetVersion) {
          throw new Error('version not found');
        }

        const updatedAt = new Date('2026-05-14T02:00:00.000Z');

        if ('title' in data) {
          Object.assign(targetVersion, {
            title: data.title,
            summary: data.summary,
            coverImageUrl: data.coverImageUrl,
            contentPayload: data.contentPayload,
            editStatus: data.editStatus,
            publishStatus: data.publishStatus,
            submittedAt: data.submittedAt,
            updatedAt,
          });
        } else {
          Object.assign(targetVersion, {
            editStatus: data.editStatus,
            submittedAt: data.submittedAt,
            updatedAt,
          });
        }

        return { ...targetVersion };
      },
      create: async ({
        data,
      }: {
        data: {
          collectionId: string;
          versionNo: number;
          title: string;
          summary: string;
          coverImageUrl: string | null;
          contentPayload: Record<string, unknown>;
          editStatus: CollectionContentEditStatus;
          publishStatus: CollectionContentPublishStatus;
          createdByMemberId: string;
        };
      }) => {
        const createdAt = new Date('2026-05-14T03:00:00.000Z');
        const createdVersion = {
          id: `ccv_${data.versionNo}`,
          collectionId: data.collectionId,
          versionNo: data.versionNo,
          title: data.title,
          summary: data.summary,
          coverImageUrl: data.coverImageUrl,
          contentPayload: data.contentPayload,
          editStatus: data.editStatus,
          publishStatus: data.publishStatus,
          submittedAt: null,
          publishedAt: null,
          createdByMemberId: data.createdByMemberId,
          createdAt,
          updatedAt: createdAt,
        };
        versions.push(createdVersion);
        return { ...createdVersion };
      },
    };

  const collectionContentReviewRecord = {
      create: async ({
        data,
      }: {
        data: {
          collectionId: string;
          contentVersionId: string;
          reviewStage: CollectionContentReviewStage;
          reviewStatus: CollectionContentReviewStatus;
          reviewSource: CollectionContentReviewSource;
        };
      }) => {
        const createdAt = new Date('2026-05-14T04:00:00.000Z');
        const record = {
          id: `crr_${reviewRecords.length + 1}`,
          collectionId: data.collectionId,
          contentVersionId: data.contentVersionId,
          reviewStage: data.reviewStage,
          reviewStatus: data.reviewStatus,
          reviewSource: data.reviewSource,
          reviewReason: null,
          reviewedByAdminUserId: null,
          reviewedAt: null,
          createdAt,
        };
        reviewRecords.push(record);
        return { ...record };
      },
    };

  const prisma = {
    member: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === member.id ? member : null,
    },
    collection: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === collection.id
          ? {
              ...collection,
              contentVersions: versions
                .slice()
                .sort((left, right) => right.versionNo - left.versionNo)
                .slice(0, 1)
                .map((item) => ({ ...item })),
            }
          : null,
    },
    collectionContentVersion,
    collectionContentReviewRecord,
    $transaction: async (operationsOrCallback: unknown) => {
      if (typeof operationsOrCallback === 'function') {
        return (
          operationsOrCallback as (client: {
            collectionContentVersion: typeof collectionContentVersion;
            collectionContentReviewRecord: typeof collectionContentReviewRecord;
          }) => Promise<unknown>
        )({
          collectionContentVersion,
          collectionContentReviewRecord,
        } as {
          collectionContentVersion: typeof collectionContentVersion;
          collectionContentReviewRecord: typeof collectionContentReviewRecord;
        });
      }

      return operationsOrCallback;
    },
  };

  return { prisma, member, collection, currentVersion, versions, reviewRecords };
}

test('MyCollectionsService.getCollectionContent returns current editable version for current member', async () => {
  const { prisma, collection, currentVersion } = createMyCollectionsPrismaMock();
  const memberContextService = new MemberContextService(prisma as never);
  const service = new MyCollectionsService(prisma as never, memberContextService);

  const result = await service.getCollectionContent(
    {
      memberId: 'mem_1',
    },
    {
      collectionId: 'col_1',
    },
  );

  assert.equal(result.collectionId, collection.id);
  assert.equal(result.currentVersion.id, currentVersion.id);
  assert.equal(result.currentVersion.versionNo, 1);
  assert.equal(result.currentVersion.title, '我的第一件藏品');
  assert.deepEqual(result.currentVersion.contentPayload, { blocks: [] });
  assert.equal(result.currentVersion.editStatus, CollectionContentEditStatus.DRAFT);
});

test('MyCollectionsService.getCollectionContent rejects when collection belongs to another member', async () => {
  const { prisma } = createMyCollectionsPrismaMock();
  const prismaWithOtherOwner = {
    ...prisma,
    collection: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === 'col_1'
          ? {
              id: 'col_1',
              collectionNo: 'COL-001',
              seriesId: 'ser_1',
              batchId: 'bat_1',
              status: CollectionStatus.OWNED,
              currentOwnerMemberId: 'mem_2',
              claimedAt: new Date('2026-05-14T01:00:00.000Z'),
              createdAt: new Date('2026-05-14T00:00:00.000Z'),
              updatedAt: new Date('2026-05-14T01:00:00.000Z'),
              contentVersions: [],
            }
          : null,
    },
  };
  const memberContextService = new MemberContextService(prismaWithOtherOwner as never);
  const service = new MyCollectionsService(
    prismaWithOtherOwner as never,
    memberContextService,
  );

  await assert.rejects(
    () =>
      service.getCollectionContent(
        {
          memberId: 'mem_1',
        },
        {
          collectionId: 'col_1',
        },
      ),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'COLLECTION_NOT_OWNED_BY_MEMBER' &&
      error.status === 403,
  );
});

test('MyCollectionsService.saveCollectionDraft updates current draft version in place', async () => {
  const { prisma, versions } = createMyCollectionsPrismaMock();
  const memberContextService = new MemberContextService(prisma as never);
  const service = new MyCollectionsService(prisma as never, memberContextService);

  const result = await service.saveCollectionDraft(
    {
      memberId: 'mem_1',
    },
    {
      collectionId: 'col_1',
    },
    {
      title: '新的标题',
      summary: '新的摘要',
      coverImageUrl: 'https://example.com/next-cover.png',
      contentPayload: {
        blocks: [{ type: 'paragraph' }],
      },
    },
  );

  assert.equal(result.versionId, 'ccv_1');
  assert.equal(result.versionNo, 1);
  assert.equal(versions.length, 1);
  assert.equal(versions[0]?.title, '新的标题');
  assert.deepEqual(versions[0]?.contentPayload, {
    blocks: [{ type: 'paragraph' }],
  });
});

test('MyCollectionsService.saveCollectionDraft creates new draft version after approved version', async () => {
  const { prisma, versions } = createMyCollectionsPrismaMock();
  versions[0]!.editStatus = CollectionContentEditStatus.APPROVED;
  versions[0]!.publishStatus = CollectionContentPublishStatus.PUBLISHED;
  const memberContextService = new MemberContextService(prisma as never);
  const service = new MyCollectionsService(prisma as never, memberContextService);

  const result = await service.saveCollectionDraft(
    {
      memberId: 'mem_1',
    },
    {
      collectionId: 'col_1',
    },
    {
      title: '二次编辑标题',
      summary: '二次编辑摘要',
      coverImageUrl: null,
      contentPayload: {
        blocks: [],
      },
    },
  );

  assert.equal(result.versionId, 'ccv_2');
  assert.equal(result.versionNo, 2);
  assert.equal(versions.length, 2);
  assert.equal(versions[1]?.editStatus, CollectionContentEditStatus.DRAFT);
  assert.equal(
    versions[1]?.publishStatus,
    CollectionContentPublishStatus.UNPUBLISHED,
  );
});

test('MyCollectionsService.saveCollectionDraft rejects when current version is under review', async () => {
  const { prisma, versions } = createMyCollectionsPrismaMock();
  versions[0]!.editStatus = CollectionContentEditStatus.UNDER_REVIEW;
  const memberContextService = new MemberContextService(prisma as never);
  const service = new MyCollectionsService(prisma as never, memberContextService);

  await assert.rejects(
    () =>
      service.saveCollectionDraft(
        {
          memberId: 'mem_1',
        },
        {
          collectionId: 'col_1',
        },
        {
          title: '审核中标题',
          summary: '审核中摘要',
          coverImageUrl: null,
          contentPayload: {
            blocks: [],
          },
        },
      ),
    (error: unknown) =>
      error instanceof BizError && error.code === 'COLLECTION_NOT_EDITABLE',
  );
});

test('MyCollectionsService.submitCollectionContent updates version status and creates review record', async () => {
  const { prisma, versions, reviewRecords } = createMyCollectionsPrismaMock();
  const memberContextService = new MemberContextService(prisma as never);
  const service = new MyCollectionsService(prisma as never, memberContextService);

  const result = await service.submitCollectionContent(
    {
      memberId: 'mem_1',
    },
    {
      collectionId: 'col_1',
    },
    {
      versionId: 'ccv_1',
    },
  );

  assert.equal(result.versionId, 'ccv_1');
  assert.equal(result.editStatus, CollectionContentEditStatus.UNDER_REVIEW);
  assert.equal(result.reviewStatus, CollectionContentReviewStatus.PENDING_MACHINE);
  assert.equal(versions[0]?.editStatus, CollectionContentEditStatus.UNDER_REVIEW);
  assert.ok(versions[0]?.submittedAt instanceof Date);
  assert.equal(reviewRecords.length, 1);
  assert.equal(reviewRecords[0]?.contentVersionId, 'ccv_1');
  assert.equal(reviewRecords[0]?.reviewStage, CollectionContentReviewStage.MACHINE);
  assert.equal(
    reviewRecords[0]?.reviewStatus,
    CollectionContentReviewStatus.PENDING_MACHINE,
  );
});

test('MyCollectionsService.submitCollectionContent rejects already submitted version', async () => {
  const { prisma, versions } = createMyCollectionsPrismaMock();
  versions[0]!.editStatus = CollectionContentEditStatus.UNDER_REVIEW;
  const memberContextService = new MemberContextService(prisma as never);
  const service = new MyCollectionsService(prisma as never, memberContextService);

  await assert.rejects(
    () =>
      service.submitCollectionContent(
        {
          memberId: 'mem_1',
        },
        {
          collectionId: 'col_1',
        },
        {
          versionId: 'ccv_1',
        },
      ),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'CONTENT_VERSION_ALREADY_SUBMITTED',
  );
});

test('MyCollectionsService.submitCollectionContent rejects when version does not belong to current collection', async () => {
  const { prisma, versions } = createMyCollectionsPrismaMock();
  versions.push({
    ...versions[0]!,
    id: 'ccv_2',
    collectionId: 'col_2',
    versionNo: 2,
  });
  const memberContextService = new MemberContextService(prisma as never);
  const service = new MyCollectionsService(prisma as never, memberContextService);

  await assert.rejects(
    () =>
      service.submitCollectionContent(
        {
          memberId: 'mem_1',
        },
        {
          collectionId: 'col_1',
        },
        {
          versionId: 'ccv_2',
        },
      ),
    (error: unknown) =>
      error instanceof BizError && error.code === 'CONTENT_VERSION_NOT_FOUND',
  );
});
