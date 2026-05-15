import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import { CollectionReviewsController } from '../../../../src/modules/admin/collection-reviews/collection-reviews.controller';

test('CollectionReviewsController.listCollectionReviews forwards query to service', async () => {
  const expectedResult = {
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
  };
  const receivedQueries: unknown[] = [];
  const listCollectionReviews = async (query: unknown) => {
    receivedQueries.push(query);
    return expectedResult;
  };
  const controller = new CollectionReviewsController({
    listCollectionReviews,
  } as never);

  const query = {
    page: '1',
    pageSize: '20',
    reviewStatus: 'PENDING_MANUAL',
    seriesId: 'ser_1',
    batchId: 'bat_1',
    collectionNo: 'COL-001',
  };
  const result = await controller.listCollectionReviews(query);

  assert.deepEqual(result, expectedResult);
  assert.equal(receivedQueries.length, 1);
  assert.deepEqual(receivedQueries[0], query);
});

test('CollectionReviewsController.approveCollectionReview forwards reviewId and body to service', async () => {
  const expectedResult = {
    reviewId: 'crr_1',
    reviewStatus: 'MANUAL_APPROVED',
    publishStatus: 'PUBLISHED',
    reviewedAt: new Date('2026-05-14T08:00:00.000Z').getTime(),
  };
  const receivedCalls: Array<{ reviewId: string; body: unknown }> = [];
  const approveCollectionReview = async (reviewId: string, body: unknown) => {
    receivedCalls.push({ reviewId, body });
    return expectedResult;
  };
  const controller = new CollectionReviewsController({
    approveCollectionReview,
  } as never);

  const body = { comment: '审核通过' };
  const result = await controller.approveCollectionReview('crr_1', body);

  assert.deepEqual(result, expectedResult);
  assert.equal(receivedCalls.length, 1);
  assert.equal(receivedCalls[0]?.reviewId, 'crr_1');
  assert.deepEqual(receivedCalls[0]?.body, body);
});

test('CollectionReviewsController.rejectCollectionReview forwards reviewId and body to service', async () => {
  const expectedResult = {
    reviewId: 'crr_1',
    reviewStatus: 'MANUAL_REJECTED',
    publishStatus: 'UNPUBLISHED',
    reviewedAt: new Date('2026-05-14T09:00:00.000Z').getTime(),
  };
  const receivedCalls: Array<{ reviewId: string; body: unknown }> = [];
  const rejectCollectionReview = async (reviewId: string, body: unknown) => {
    receivedCalls.push({ reviewId, body });
    return expectedResult;
  };
  const controller = new CollectionReviewsController({
    rejectCollectionReview,
  } as never);

  const body = { reason: '违规内容' };
  const result = await controller.rejectCollectionReview('crr_1', body);

  assert.deepEqual(result, expectedResult);
  assert.equal(receivedCalls.length, 1);
  assert.equal(receivedCalls[0]?.reviewId, 'crr_1');
  assert.deepEqual(receivedCalls[0]?.body, body);
});
