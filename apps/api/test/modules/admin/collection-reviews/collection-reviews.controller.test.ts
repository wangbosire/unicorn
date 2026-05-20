import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import { ADMIN_REQUIRED_PERMISSIONS_KEY } from '../../../../src/modules/admin/auth/admin-permissions.decorator';
import {
  ADMIN_PERMISSION_COLLECTION_REVIEWS_APPROVE,
  ADMIN_PERMISSION_COLLECTION_REVIEWS_READ,
  ADMIN_PERMISSION_COLLECTION_REVIEWS_REJECT,
  ADMIN_PERMISSION_COLLECTION_REVIEWS_TAKEDOWN,
} from '../../../../src/modules/admin/auth/admin-permission-keys';
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

test('CollectionReviewsController.getCollectionReviewById forwards reviewId to service', async () => {
  const expectedResult = {
    reviewId: 'crr_1',
    collectionNo: 'COL-001',
  };
  const receivedIds: string[] = [];
  const getCollectionReviewById = async (reviewId: string) => {
    receivedIds.push(reviewId);
    return expectedResult;
  };
  const controller = new CollectionReviewsController({
    getCollectionReviewById,
  } as never);

  const result = await controller.getCollectionReviewById('crr_1');

  assert.deepEqual(result, expectedResult);
  assert.deepEqual(receivedIds, ['crr_1']);
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

test('CollectionReviewsController.listCollectionReviewHistory forwards query to service', async () => {
  const expectedResult = {
    items: [],
  };
  const receivedQueries: unknown[] = [];
  const listCollectionReviewHistory = async (query: unknown) => {
    receivedQueries.push(query);
    return expectedResult;
  };
  const controller = new CollectionReviewsController({
    listCollectionReviewHistory,
  } as never);

  const query = { collectionNo: 'COL-001', contentVersionId: 'ccv_1' };
  const result = await controller.listCollectionReviewHistory(query);

  assert.deepEqual(result, expectedResult);
  assert.deepEqual(receivedQueries, [query]);
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

test('CollectionReviewsController.listCollectionReviewHistory requires collection_reviews.read', () => {
  const required = Reflect.getMetadata(
    ADMIN_REQUIRED_PERMISSIONS_KEY,
    CollectionReviewsController.prototype.listCollectionReviewHistory,
  );

  assert.deepEqual(required, [ADMIN_PERMISSION_COLLECTION_REVIEWS_READ]);
});

test('CollectionReviewsController.listCollectionReviews requires collection_reviews.read', () => {
  const required = Reflect.getMetadata(
    ADMIN_REQUIRED_PERMISSIONS_KEY,
    CollectionReviewsController.prototype.listCollectionReviews,
  );

  assert.deepEqual(required, [ADMIN_PERMISSION_COLLECTION_REVIEWS_READ]);
});

test('CollectionReviewsController.getCollectionReviewById requires collection_reviews.read', () => {
  const required = Reflect.getMetadata(
    ADMIN_REQUIRED_PERMISSIONS_KEY,
    CollectionReviewsController.prototype.getCollectionReviewById,
  );

  assert.deepEqual(required, [ADMIN_PERMISSION_COLLECTION_REVIEWS_READ]);
});

test('CollectionReviewsController.approveCollectionReview requires collection_reviews.approve', () => {
  const required = Reflect.getMetadata(
    ADMIN_REQUIRED_PERMISSIONS_KEY,
    CollectionReviewsController.prototype.approveCollectionReview,
  );

  assert.deepEqual(required, [ADMIN_PERMISSION_COLLECTION_REVIEWS_APPROVE]);
});

test('CollectionReviewsController.rejectCollectionReview requires collection_reviews.reject', () => {
  const required = Reflect.getMetadata(
    ADMIN_REQUIRED_PERMISSIONS_KEY,
    CollectionReviewsController.prototype.rejectCollectionReview,
  );

  assert.deepEqual(required, [ADMIN_PERMISSION_COLLECTION_REVIEWS_REJECT]);
});

test('CollectionReviewsController.takedownPublishedContentVersion requires collection_reviews.takedown', () => {
  const required = Reflect.getMetadata(
    ADMIN_REQUIRED_PERMISSIONS_KEY,
    CollectionReviewsController.prototype.takedownPublishedContentVersion,
  );

  assert.deepEqual(required, [ADMIN_PERMISSION_COLLECTION_REVIEWS_TAKEDOWN]);
});
