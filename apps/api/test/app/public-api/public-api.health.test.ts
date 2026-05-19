import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import type { Response } from 'express';
import { HttpStatus } from '@nestjs/common';
import { PublicApiController } from '../../../src/app/public-api/public-api.controller';
import type {
  DeepHealthResult,
  HealthProbeService,
} from '../../../src/common/observability/health-probe.service';

function createResponseMock(): Response & { statusCalls: number[] } {
  const calls: number[] = [];
  const mock = {
    status(code: number): Response {
      calls.push(code);
      return mock as unknown as Response;
    },
    statusCalls: calls,
  };
  return mock as unknown as Response & { statusCalls: number[] };
}

function createHealthProbeMock(result: DeepHealthResult): HealthProbeService {
  return {
    probe: async () => result,
  } as unknown as HealthProbeService;
}

test('PublicApiController.getHealth returns shallow ok without deep=1', async () => {
  const controller = new PublicApiController(
    createHealthProbeMock({
      status: 'fail',
      mysql: { status: 'fail', durationMs: 1, error: 'should not be called' },
      redis: { status: 'fail', durationMs: 1 },
    }),
  );
  const res = createResponseMock();

  const body = await controller.getHealth(undefined, res);

  assert.deepEqual(body, { scope: 'public-api', status: 'ok' });
  assert.equal(res.statusCalls.length, 0);
});

test('PublicApiController.getHealth returns ok 200 when deep probe succeeds', async () => {
  const probeResult: DeepHealthResult = {
    status: 'ok',
    mysql: { status: 'ok', durationMs: 5 },
    redis: { status: 'ok', durationMs: 3 },
  };
  const controller = new PublicApiController(createHealthProbeMock(probeResult));
  const res = createResponseMock();

  const body = await controller.getHealth('1', res);

  assert.equal(body.status, 'ok');
  assert.deepEqual(body.mysql, probeResult.mysql);
  assert.deepEqual(body.redis, probeResult.redis);
  assert.equal(res.statusCalls.length, 0); // 默认 200，无需显式 status()
});

test('PublicApiController.getHealth returns 503 when deep probe fails', async () => {
  const probeResult: DeepHealthResult = {
    status: 'fail',
    mysql: { status: 'fail', durationMs: 510, error: 'probe timeout' },
    redis: { status: 'ok', durationMs: 2 },
  };
  const controller = new PublicApiController(createHealthProbeMock(probeResult));
  const res = createResponseMock();

  const body = await controller.getHealth('true', res);

  assert.equal(body.status, 'fail');
  assert.deepEqual(res.statusCalls, [HttpStatus.SERVICE_UNAVAILABLE]);
});
