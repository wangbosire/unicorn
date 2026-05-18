import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import { CollectionActivationController } from '../../../../src/modules/member/collection-activation/collection-activation.controller';

test('CollectionActivationController.activateCollection forwards auth context and body to service', async () => {
  const expectedResult = {
    collectionId: 'col_1',
    collectionNo: 'COL-20260514-AAAAA',
    status: 'OWNED',
    claimedAt: new Date('2026-05-14T08:00:00.000Z').getTime(),
    currentVersionId: 'ccv_1',
  };
  const receivedCalls: Array<{ authContext: unknown; body: unknown }> = [];
  const activateCollection = async (authContext: unknown, body: unknown) => {
    receivedCalls.push({ authContext, body });
    return expectedResult;
  };
  const controller = new CollectionActivationController({
    activateCollection,
  } as never);

  const body = {
    activationCode: 'ABCD-EFGH-IJKL',
  };
  const result = await controller.activateCollection(
    'Bearer member.jwt.token',
    body,
  );

  assert.deepEqual(result, expectedResult);
  assert.equal(receivedCalls.length, 1);
  assert.deepEqual(receivedCalls[0]?.authContext, {
    authorization: 'Bearer member.jwt.token',
  });
  assert.deepEqual(receivedCalls[0]?.body, body);
});
