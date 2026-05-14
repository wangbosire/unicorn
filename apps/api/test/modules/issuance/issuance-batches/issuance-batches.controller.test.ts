import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import { IssuanceBatchesController } from '../../../../src/modules/issuance/issuance-batches/issuance-batches.controller';

test('IssuanceBatchesController.listIssuanceBatches forwards query to service', async () => {
  const expectedResult = {
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
  };
  const receivedQueries: unknown[] = [];
  const listIssuanceBatches = async (query: unknown) => {
    receivedQueries.push(query);
    return expectedResult;
  };
  const controller = new IssuanceBatchesController({
    listIssuanceBatches,
  } as never);

  const query = {
    page: '1',
    pageSize: '20',
    keyword: '首发',
    seriesId: 'ser_1',
    status: 'ENABLED',
  };
  const result = await controller.listIssuanceBatches(query);

  assert.deepEqual(result, expectedResult);
  assert.equal(receivedQueries.length, 1);
  assert.deepEqual(receivedQueries[0], query);
});

test('IssuanceBatchesController.createIssuanceBatch forwards body to service', async () => {
  const expectedResult = {
    id: 'bat_1',
    batchNo: 'BAT-20260514-AAAA',
    seriesId: 'ser_1',
    name: '星辉远征首发',
    quantity: 50,
    status: 'ENABLED',
  };
  const receivedBodies: unknown[] = [];
  const createIssuanceBatch = async (body: unknown) => {
    receivedBodies.push(body);
    return expectedResult;
  };
  const controller = new IssuanceBatchesController({
    createIssuanceBatch,
  } as never);

  const body = {
    seriesId: 'ser_1',
    name: '星辉远征首发',
    quantity: 50,
    activateValidFrom: '2026-05-14T00:00:00.000Z',
    activateValidTo: '2026-06-14T00:00:00.000Z',
    remark: '首发批次',
  };
  const result = await controller.createIssuanceBatch(body);

  assert.deepEqual(result, expectedResult);
  assert.equal(receivedBodies.length, 1);
  assert.deepEqual(receivedBodies[0], body);
});

test('IssuanceBatchesController.updateIssuanceBatchStatus forwards batchId and body to service', async () => {
  const expectedResult = {
    id: 'bat_1',
    batchNo: 'BAT-20260514-AAAA',
    seriesId: 'ser_1',
    name: '星辉远征首发',
    quantity: 50,
    status: 'DISABLED',
  };
  const receivedCalls: Array<{ batchId: string; body: unknown }> = [];
  const updateIssuanceBatchStatus = async (batchId: string, body: unknown) => {
    receivedCalls.push({ batchId, body });
    return expectedResult;
  };
  const controller = new IssuanceBatchesController({
    updateIssuanceBatchStatus,
  } as never);

  const body = { status: 'DISABLED' as const };
  const result = await controller.updateIssuanceBatchStatus('bat_1', body);

  assert.deepEqual(result, expectedResult);
  assert.equal(receivedCalls.length, 1);
  assert.equal(receivedCalls[0]?.batchId, 'bat_1');
  assert.deepEqual(receivedCalls[0]?.body, body);
});
