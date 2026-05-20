import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import { ADMIN_REQUIRED_PERMISSIONS_KEY } from '../../../../src/modules/admin/auth/admin-permissions.decorator';
import {
  ADMIN_PERMISSION_COLLECTION_COMMENTS_APPROVE,
  ADMIN_PERMISSION_COLLECTION_COMMENTS_BLOCK,
  ADMIN_PERMISSION_COLLECTION_COMMENTS_READ,
  ADMIN_PERMISSION_COLLECTION_COMMENTS_REJECT,
} from '../../../../src/modules/admin/auth/admin-permission-keys';
import { CollectionCommentsController } from '../../../../src/modules/admin/collection-comments/collection-comments.controller';

test('CollectionCommentsController.listCollectionComments requires collection_comments.read', () => {
  const required = Reflect.getMetadata(
    ADMIN_REQUIRED_PERMISSIONS_KEY,
    CollectionCommentsController.prototype.listCollectionComments,
  );

  assert.deepEqual(required, [ADMIN_PERMISSION_COLLECTION_COMMENTS_READ]);
});

test('CollectionCommentsController.listCollectionCommentReviews requires collection_comments.read', () => {
  const required = Reflect.getMetadata(
    ADMIN_REQUIRED_PERMISSIONS_KEY,
    CollectionCommentsController.prototype.listCollectionCommentReviews,
  );

  assert.deepEqual(required, [ADMIN_PERMISSION_COLLECTION_COMMENTS_READ]);
});

test('CollectionCommentsController.approveCollectionComment requires collection_comments.approve', () => {
  const required = Reflect.getMetadata(
    ADMIN_REQUIRED_PERMISSIONS_KEY,
    CollectionCommentsController.prototype.approveCollectionComment,
  );

  assert.deepEqual(required, [ADMIN_PERMISSION_COLLECTION_COMMENTS_APPROVE]);
});

test('CollectionCommentsController.rejectCollectionComment requires collection_comments.reject', () => {
  const required = Reflect.getMetadata(
    ADMIN_REQUIRED_PERMISSIONS_KEY,
    CollectionCommentsController.prototype.rejectCollectionComment,
  );

  assert.deepEqual(required, [ADMIN_PERMISSION_COLLECTION_COMMENTS_REJECT]);
});

test('CollectionCommentsController.blockCollectionComment requires collection_comments.block', () => {
  const required = Reflect.getMetadata(
    ADMIN_REQUIRED_PERMISSIONS_KEY,
    CollectionCommentsController.prototype.blockCollectionComment,
  );

  assert.deepEqual(required, [ADMIN_PERMISSION_COLLECTION_COMMENTS_BLOCK]);
});
