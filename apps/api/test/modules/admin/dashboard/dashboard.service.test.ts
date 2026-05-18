import * as assert from 'node:assert/strict';
import {
  ActivationCodeStatus,
  CollectionCommentStatus,
  CollectionContentPublishStatus,
  CollectionContentReviewStage,
  CollectionContentReviewStatus,
  CollectionStatus,
} from '@prisma/client';
import { test } from 'vitest';
import { DashboardService } from '../../../../src/modules/admin/dashboard/dashboard.service';

test('DashboardService.getDashboardOverview returns aggregated metrics', async () => {
  const calls: {
    activationCodeWhere?: unknown[];
    collectionWhere?: unknown;
    collectionWhereCalls?: unknown[];
    reviewWhere?: unknown;
    contentVersionWhere?: unknown;
    commentWhere?: unknown;
  } = {};

  const prisma = {
    activationCode: {
      count: async ({ where }: { where?: unknown } = {}) => {
        if (!calls.activationCodeWhere) {
          calls.activationCodeWhere = [];
        }
        calls.activationCodeWhere.push(where);
        return where ? 5 : 12;
      },
    },
    collection: {
      count: async ({ where }: { where: unknown }) => {
        if (!calls.collectionWhereCalls) {
          calls.collectionWhereCalls = [];
        }
        calls.collectionWhereCalls.push(where);
        if (!calls.collectionWhere) {
          calls.collectionWhere = where;
        }
        if (
          JSON.stringify(where) ===
          JSON.stringify({
            status: CollectionStatus.PENDING_CLAIM,
          })
        ) {
          return 4;
        }
        if (
          JSON.stringify(where) ===
          JSON.stringify({
            status: CollectionStatus.FROZEN,
          })
        ) {
          return 1;
        }
        return 8;
      },
    },
    collectionContentReviewRecord: {
      count: async ({ where }: { where: unknown }) => {
        calls.reviewWhere = where;
        return 3;
      },
    },
    collectionContentVersion: {
      count: async ({ where }: { where: unknown }) => {
        calls.contentVersionWhere = where;
        return 6;
      },
    },
    collectionComment: {
      count: async ({ where }: { where: unknown }) => {
        calls.commentWhere = where;
        return 2;
      },
    },
    member: {
      count: async () => 20,
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };

  const service = new DashboardService(prisma as never);
  const result = await service.getDashboardOverview();

  assert.equal(result.activationCodesTotal, 12);
  assert.equal(result.usedActivationCodesTotal, 5);
  assert.equal(result.claimedCollectionsTotal, 8);
  assert.equal(result.pendingClaimCollectionsTotal, 4);
  assert.equal(result.frozenCollectionsTotal, 1);
  assert.equal(result.pendingManualCollectionReviewsTotal, 3);
  assert.equal(result.publishedContentVersionsTotal, 6);
  assert.equal(result.pendingManualCommentsTotal, 2);
  assert.equal(result.membersTotal, 20);
  assert.ok(Number.isFinite(result.generatedAt));
  assert.deepEqual(calls.activationCodeWhere, [
    undefined,
    {
      status: ActivationCodeStatus.USED,
    },
  ]);
  assert.deepEqual(calls.collectionWhere, {
    claimedAt: { not: null },
  });
  assert.deepEqual(calls.collectionWhereCalls, [
    {
      claimedAt: { not: null },
    },
    {
      status: CollectionStatus.PENDING_CLAIM,
    },
    {
      status: CollectionStatus.FROZEN,
    },
  ]);
  assert.deepEqual(calls.reviewWhere, {
    reviewStage: CollectionContentReviewStage.MANUAL,
    reviewStatus: CollectionContentReviewStatus.PENDING_MANUAL,
  });
  assert.deepEqual(calls.contentVersionWhere, {
    publishStatus: CollectionContentPublishStatus.PUBLISHED,
  });
  assert.deepEqual(calls.commentWhere, {
    status: CollectionCommentStatus.PENDING_MANUAL,
  });
});
