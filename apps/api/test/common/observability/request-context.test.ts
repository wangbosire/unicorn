import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import { getRequestId, runWithRequestContext } from '../../../src/common/observability/request-context';

test('getRequestId returns null outside of any context', () => {
  assert.equal(getRequestId(), null);
});

test('runWithRequestContext exposes requestId synchronously', () => {
  const result = runWithRequestContext({ requestId: 'req-sync' }, () => getRequestId());
  assert.equal(result, 'req-sync');
});

test('runWithRequestContext exposes requestId across async hops', async () => {
  const id = await runWithRequestContext({ requestId: 'req-async' }, async () => {
    await Promise.resolve();
    await new Promise<void>((r) => setImmediate(r));
    return getRequestId();
  });
  assert.equal(id, 'req-async');
});

test('runWithRequestContext isolates concurrent contexts', async () => {
  const results = await Promise.all([
    runWithRequestContext({ requestId: 'req-A' }, async () => {
      await new Promise<void>((r) => setImmediate(r));
      return getRequestId();
    }),
    runWithRequestContext({ requestId: 'req-B' }, async () => {
      await new Promise<void>((r) => setImmediate(r));
      return getRequestId();
    }),
  ]);
  assert.deepEqual(results, ['req-A', 'req-B']);
});
