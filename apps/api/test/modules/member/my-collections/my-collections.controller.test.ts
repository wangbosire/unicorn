import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import { MyCollectionsController } from '../../../../src/modules/member/my-collections/my-collections.controller';

test('MyCollectionsController.listMyCollections forwards auth context and query', async () => {
  const expectedResult = {
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
  };
  const receivedListCalls: Array<{ authContext: unknown; query: unknown }> = [];
  const listMyCollections = async (authContext: unknown, query: unknown) => {
    receivedListCalls.push({ authContext, query });
    return expectedResult;
  };
  const controller = new MyCollectionsController({
    listMyCollections,
  } as never);

  const query = {
    page: '1',
    pageSize: '20',
    status: 'OWNED',
  };
  const result = await controller.listMyCollections('Bearer member.jwt.token', query);

  assert.deepEqual(result, expectedResult);
  assert.equal(receivedListCalls.length, 1);
  assert.deepEqual(receivedListCalls[0]?.authContext, {
    authorization: 'Bearer member.jwt.token',
  });
  assert.deepEqual(receivedListCalls[0]?.query, query);
});

test('MyCollectionsController.saveCollectionDraft forwards auth context, params and body', async () => {
  const expectedResult = {
    collectionId: 'col_1',
    versionId: 'ccv_2',
    versionNo: 2,
    editStatus: 'DRAFT',
  };
  const receivedSaveCalls: Array<{
    authContext: unknown;
    params: unknown;
    body: unknown;
  }> = [];
  const saveCollectionDraft = async (
    authContext: unknown,
    params: unknown,
    body: unknown,
  ) => {
    receivedSaveCalls.push({ authContext, params, body });
    return expectedResult;
  };
  const controller = new MyCollectionsController({
    saveCollectionDraft,
  } as never);

  const params = { collectionId: 'col_1' };
  const body = {
    title: '新的标题',
    summary: '新的摘要',
    coverImageUrl: null,
    contentPayload: {
      blocks: [],
    },
  };
  const result = await controller.saveCollectionDraft(
    'Bearer member.jwt.token',
    params,
    body,
  );

  assert.deepEqual(result, expectedResult);
  assert.equal(receivedSaveCalls.length, 1);
  assert.deepEqual(receivedSaveCalls[0]?.authContext, {
    authorization: 'Bearer member.jwt.token',
  });
  assert.deepEqual(receivedSaveCalls[0]?.params, params);
  assert.deepEqual(receivedSaveCalls[0]?.body, body);
});

test('MyCollectionsController.getMyCollectionById forwards auth context and params', async () => {
  const expectedResult = {
    id: 'col_1',
    collectionNo: 'COL-001',
  };
  const receivedDetailCalls: Array<{ authContext: unknown; params: unknown }> = [];
  const getMyCollectionById = async (authContext: unknown, params: unknown) => {
    receivedDetailCalls.push({ authContext, params });
    return expectedResult;
  };
  const controller = new MyCollectionsController({
    getMyCollectionById,
  } as never);

  const params = { collectionId: 'col_1' };
  const result = await controller.getMyCollectionById('Bearer member.jwt.token', params);

  assert.deepEqual(result, expectedResult);
  assert.equal(receivedDetailCalls.length, 1);
  assert.deepEqual(receivedDetailCalls[0]?.authContext, {
    authorization: 'Bearer member.jwt.token',
  });
  assert.deepEqual(receivedDetailCalls[0]?.params, params);
});
