import * as assert from 'node:assert/strict';
import { afterEach, test } from 'vitest';
import { HealthProbeService } from '../../../src/common/observability/health-probe.service';

interface FakeRedisOptions {
  pingDelayMs?: number;
  pingRejects?: boolean;
  connectRejects?: boolean;
}

function createFakeRedis(opts: FakeRedisOptions = {}) {
  return {
    on() {
      return this;
    },
    async connect() {
      if (opts.connectRejects) {
        throw new Error('connect failed');
      }
    },
    async ping(): Promise<'PONG'> {
      if (opts.pingDelayMs) {
        await new Promise((r) => setTimeout(r, opts.pingDelayMs));
      }
      if (opts.pingRejects) {
        throw new Error('ping failed');
      }
      return 'PONG';
    },
    async quit() {
      return 'OK' as const;
    },
  };
}

function createFakePrisma(opts: { rejects?: boolean; delayMs?: number } = {}) {
  return {
    async $queryRawUnsafe(_sql: string): Promise<unknown> {
      if (opts.delayMs) {
        await new Promise((r) => setTimeout(r, opts.delayMs));
      }
      if (opts.rejects) {
        throw new Error('mysql down');
      }
      return [{ '1': 1 }];
    },
  };
}

const fakeConfig = {
  get: (_key: string) => 'redis://127.0.0.1:6379',
};

let probe: HealthProbeService | null = null;

afterEach(async () => {
  if (probe) {
    await probe.onModuleDestroy();
    probe = null;
  }
});

test('HealthProbeService.probe returns ok when MySQL and Redis succeed', async () => {
  const service = new HealthProbeService(createFakePrisma() as never, fakeConfig as never);
  // 注入 fake Redis 取代构造时创建的真实 IORedis 实例。
  (service as unknown as { redis: ReturnType<typeof createFakeRedis> }).redis = createFakeRedis();
  probe = service;

  const result = await service.probe();
  assert.equal(result.status, 'ok');
  assert.equal(result.mysql.status, 'ok');
  assert.equal(result.redis.status, 'ok');
});

test('HealthProbeService.probe reports fail when MySQL rejects', async () => {
  const service = new HealthProbeService(
    createFakePrisma({ rejects: true }) as never,
    fakeConfig as never,
  );
  (service as unknown as { redis: ReturnType<typeof createFakeRedis> }).redis = createFakeRedis();
  probe = service;

  const result = await service.probe();
  assert.equal(result.status, 'fail');
  assert.equal(result.mysql.status, 'fail');
  assert.match(result.mysql.error ?? '', /mysql down/);
});

test('HealthProbeService.probe reports fail when Redis times out', async () => {
  const service = new HealthProbeService(createFakePrisma() as never, fakeConfig as never);
  (service as unknown as { redis: ReturnType<typeof createFakeRedis> }).redis = createFakeRedis({
    pingDelayMs: 1000,
  });
  probe = service;

  const result = await service.probe();
  assert.equal(result.status, 'fail');
  assert.equal(result.redis.status, 'fail');
  assert.match(result.redis.error ?? '', /timeout/);
});
