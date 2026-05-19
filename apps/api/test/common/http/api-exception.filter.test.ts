import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ApiExceptionFilter } from '../../../src/common/http/api-exception.filter';
import { BizError } from '../../../src/common/http/biz-error';

function createHttpHostMock(reqMeta: { method?: string; url?: string } = {}) {
  const calls: Array<{ status: number; body: Record<string, unknown> }> = [];

  const response = {
    status(code: number) {
      return {
        json(body: Record<string, unknown>) {
          calls.push({ status: code, body });
        },
      };
    },
  };

  const request = {
    method: reqMeta.method ?? 'GET',
    url: reqMeta.url ?? '/api/test',
    originalUrl: reqMeta.url ?? '/api/test',
  };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  };

  return { host, calls };
}

test('ApiExceptionFilter converts BizError into standard error response', () => {
  const filter = new ApiExceptionFilter();
  const { host, calls } = createHttpHostMock();

  filter.catch(
    new BizError({
      code: 'VALIDATION_ERROR',
      message: 'validation failed',
      details: {
        issues: [{ path: 'name', message: 'name is required' }],
      },
    }),
    host as never,
  );

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    status: 400,
    body: {
      code: 'VALIDATION_ERROR',
      message: 'validation failed',
      details: {
        issues: [{ path: 'name', message: 'name is required' }],
      },
    },
  });
});

test('ApiExceptionFilter converts HttpException into default error code response', () => {
  const filter = new ApiExceptionFilter();
  const { host, calls } = createHttpHostMock();

  filter.catch(
    new BadRequestException({
      message: ['page must be positive', 'pageSize must be positive'],
    }),
    host as never,
  );

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    status: 400,
    body: {
      code: 'BAD_REQUEST',
      message: 'page must be positive, pageSize must be positive',
    },
  });
});

test('ApiExceptionFilter converts unknown errors into internal server error response', () => {
  const filter = new ApiExceptionFilter();
  const { host, calls } = createHttpHostMock();

  filter.catch(new Error('unexpected'), host as never);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    status: 500,
    body: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'internal server error',
    },
  });
});
