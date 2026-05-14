import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import { SeriesController } from '../../../../src/modules/issuance/series/series.controller';

test('SeriesController.listSeries forwards query to service', async () => {
  const expectedResult = {
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
  };
  const receivedQueries: unknown[] = [];
  const listSeries = async (query: unknown) => {
    receivedQueries.push(query);
    return expectedResult;
  };
  const controller = new SeriesController({
    listSeries,
  } as never);

  const query = {
    page: '1',
    pageSize: '20',
    keyword: '星辉',
    status: 'ENABLED',
  };
  const result = await controller.listSeries(query);

  assert.deepEqual(result, expectedResult);
  assert.equal(receivedQueries.length, 1);
  assert.deepEqual(receivedQueries[0], query);
});

test('SeriesController.updateSeriesStatus forwards path param and body to service', async () => {
  const expectedResult = {
    id: 'ser_1',
    seriesNo: 'SER-20260514-AAAA',
    name: '星辉远征',
    description: '星际探索主题系列',
    status: 'DISABLED',
  };
  const receivedCalls: Array<{ seriesId: string; body: unknown }> = [];
  const updateSeriesStatus = async (seriesId: string, body: unknown) => {
    receivedCalls.push({ seriesId, body });
    return expectedResult;
  };
  const controller = new SeriesController({
    updateSeriesStatus,
  } as never);

  const body = { status: 'DISABLED' as const };
  const result = await controller.updateSeriesStatus('ser_1', body);

  assert.deepEqual(result, expectedResult);
  assert.equal(receivedCalls.length, 1);
  assert.equal(receivedCalls[0]?.seriesId, 'ser_1');
  assert.deepEqual(receivedCalls[0]?.body, body);
});
