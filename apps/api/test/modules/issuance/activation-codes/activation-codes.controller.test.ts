import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import { ActivationCodesController } from '../../../../src/modules/issuance/activation-codes/activation-codes.controller';

test('ActivationCodesController.listActivationCodes forwards query to service', async () => {
  const expectedResult = {
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
  };
  const receivedQueries: unknown[] = [];
  const listActivationCodes = async (query: unknown) => {
    receivedQueries.push(query);
    return expectedResult;
  };
  const controller = new ActivationCodesController({
    listActivationCodes,
  } as never);

  const query = {
    page: '1',
    pageSize: '20',
    batchId: 'bat_1',
    status: 'UNISSUED',
    keyword: 'COL-',
  };
  const result = await controller.listActivationCodes(query);

  assert.deepEqual(result, expectedResult);
  assert.equal(receivedQueries.length, 1);
  assert.deepEqual(receivedQueries[0], query);
});

test('ActivationCodesController.generateActivationCodes forwards body to service', async () => {
  const expectedResult = {
    batchId: 'bat_1',
    generatedCount: 2,
    activationCodes: [],
  };
  const receivedBodies: unknown[] = [];
  const generateActivationCodes = async (body: unknown) => {
    receivedBodies.push(body);
    return expectedResult;
  };
  const controller = new ActivationCodesController({
    generateActivationCodes,
  } as never);

  const body = {
    batchId: 'bat_1',
    count: 2,
    issuedChannel: 'offline_event',
  };
  const result = await controller.generateActivationCodes(body);

  assert.deepEqual(result, expectedResult);
  assert.equal(receivedBodies.length, 1);
  assert.deepEqual(receivedBodies[0], body);
});
