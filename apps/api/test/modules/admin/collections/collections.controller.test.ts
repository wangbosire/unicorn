import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import { BizError } from '../../../../src/common/http/biz-error';
import { CollectionsController } from '../../../../src/modules/admin/collections/collections.controller';

test('CollectionsController.listCollections allows collections.read permission', async () => {
  const receivedQueries: unknown[] = [];
  const controller = new CollectionsController({
    listCollections: async (query: unknown) => {
      receivedQueries.push(query);
      return { items: [], page: 1, pageSize: 20, total: 0 };
    },
  } as never);

  const query = { page: '1', pageSize: '20' };
  const result = await controller.listCollections(
    query,
    {
      admin: {
        permissionKeys: ['collections.read'],
      },
    } as never,
  );

  assert.equal(result.total, 0);
  assert.deepEqual(receivedQueries, [query]);
});

test('CollectionsController.listCollections rejects when collections.read is missing', async () => {
  const controller = new CollectionsController({
    listCollections: async () => ({ items: [], page: 1, pageSize: 20, total: 0 }),
  } as never);

  await assert.rejects(
    () =>
      controller.listCollections(
        { page: '1', pageSize: '20' },
        {
          admin: {
            permissionKeys: ['collections.toggle_status'],
          },
        } as never,
      ),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'ADMIN_AUTH_FORBIDDEN' &&
      error.status === 403,
  );
});

test('CollectionsController.updateCollectionStatus allows collections.toggle_status permission', async () => {
  const receivedCalls: Array<{ collectionId: string; body: unknown }> = [];
  const controller = new CollectionsController({
    updateCollectionStatus: async (collectionId: string, body: unknown) => {
      receivedCalls.push({ collectionId, body });
      return {
        id: 'col_1',
        collectionNo: 'COL-001',
        status: 'FROZEN',
        updatedAt: 1_716_000_000_000,
      };
    },
  } as never);

  const result = await controller.updateCollectionStatus(
    'col_1',
    { status: 'FROZEN' },
    {
      admin: {
        permissionKeys: ['collections.toggle_status'],
      },
    } as never,
  );

  assert.equal(result.status, 'FROZEN');
  assert.deepEqual(receivedCalls, [
    {
      collectionId: 'col_1',
      body: { status: 'FROZEN' },
    },
  ]);
});

test('CollectionsController.updateCollectionStatus rejects when collections.toggle_status is missing', async () => {
  const controller = new CollectionsController({
    updateCollectionStatus: async () => {
      throw new Error('not used');
    },
  } as never);

  await assert.rejects(
    () =>
      controller.updateCollectionStatus(
        'col_1',
        { status: 'FROZEN' },
        {
          admin: {
            permissionKeys: ['collections.read'],
          },
        } as never,
      ),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'ADMIN_AUTH_FORBIDDEN' &&
      error.status === 403,
  );
});
