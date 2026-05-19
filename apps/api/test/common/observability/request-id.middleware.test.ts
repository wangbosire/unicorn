import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { RequestIdMiddleware } from '../../../src/common/observability/request-id.middleware';
import { getRequestId } from '../../../src/common/observability/request-context';

function createReqRes(headers: Record<string, string | string[] | undefined> = {}): {
  req: Request;
  res: Response;
  setHeaderCalls: Array<{ name: string; value: string }>;
} {
  const setHeaderCalls: Array<{ name: string; value: string }> = [];
  const req = { headers } as Request;
  const res = {
    setHeader(name: string, value: string) {
      setHeaderCalls.push({ name, value });
    },
  } as unknown as Response;
  return { req, res, setHeaderCalls };
}

test('RequestIdMiddleware generates UUID when header absent', () => {
  const middleware = new RequestIdMiddleware();
  const { req, res, setHeaderCalls } = createReqRes();
  let observed: string | null = null;
  const next: NextFunction = () => {
    observed = getRequestId();
  };

  middleware.use(req, res, next);

  assert.match(observed ?? '', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.equal(setHeaderCalls.length, 1);
  assert.equal(setHeaderCalls[0]?.name, 'x-request-id');
  assert.equal(setHeaderCalls[0]?.value, observed);
});

test('RequestIdMiddleware uses sanitized header when provided', () => {
  const middleware = new RequestIdMiddleware();
  const { req, res, setHeaderCalls } = createReqRes({ 'x-request-id': 'abc-123_456:trace' });
  let observed: string | null = null;
  middleware.use(req, res, () => {
    observed = getRequestId();
  });

  assert.equal(observed, 'abc-123_456:trace');
  assert.equal(setHeaderCalls[0]?.value, 'abc-123_456:trace');
});

test('RequestIdMiddleware rejects unsafe header characters', () => {
  const middleware = new RequestIdMiddleware();
  const { req, res } = createReqRes({ 'x-request-id': 'bad id with spaces' });
  let observed: string | null = null;
  middleware.use(req, res, () => {
    observed = getRequestId();
  });

  assert.match(observed ?? '', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
});

test('RequestIdMiddleware truncates oversized header values', () => {
  const middleware = new RequestIdMiddleware();
  const long = 'a'.repeat(200);
  const { req, res } = createReqRes({ 'x-request-id': long });
  let observed: string | null = null;
  middleware.use(req, res, () => {
    observed = getRequestId();
  });

  assert.equal(observed?.length, 64);
});
