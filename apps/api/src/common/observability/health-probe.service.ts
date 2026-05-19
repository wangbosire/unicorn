import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';
import { PrismaService } from '../../platform/prisma/prisma.service';
import { parseRedisUrl } from '../../platform/queue/redis.config';

/// 单个依赖探活结果。
export interface ProbeResult {
  status: 'ok' | 'fail';
  durationMs: number;
  error?: string;
}

export interface DeepHealthResult {
  status: 'ok' | 'fail';
  mysql: ProbeResult;
  redis: ProbeResult;
}

/// 探活超时上限；任一依赖超过该时间视为失败。
const PROBE_TIMEOUT_MS = 500;

/// 健康检查深度探活。
/// 同时探活 MySQL 和 Redis；超时或失败返回 `fail`，由调用方决定 HTTP 状态。
@Injectable()
export class HealthProbeService implements OnModuleDestroy {
  private readonly logger = new Logger(HealthProbeService.name);
  private readonly redis: IORedis;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.redis = new IORedis({
      ...parseRedisUrl(config.get<string>('REDIS_URL')),
      lazyConnect: true,
      connectTimeout: PROBE_TIMEOUT_MS,
    });
    this.redis.on('error', () => {
      // 静默：探活失败由探活函数显式处理；这里避免噪声日志。
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }

  async probe(): Promise<DeepHealthResult> {
    const [mysql, redis] = await Promise.all([this.probeMysql(), this.probeRedis()]);
    const status: 'ok' | 'fail' =
      mysql.status === 'ok' && redis.status === 'ok' ? 'ok' : 'fail';
    if (status === 'fail') {
      this.logger.warn('health probe failed', {
        event: 'health.probe.failed',
        mysqlStatus: mysql.status,
        redisStatus: redis.status,
      });
    }
    return { status, mysql, redis };
  }

  private async probeMysql(): Promise<ProbeResult> {
    return this.withTimeout(async () => {
      await this.prisma.$queryRawUnsafe('SELECT 1');
    });
  }

  private async probeRedis(): Promise<ProbeResult> {
    return this.withTimeout(async () => {
      await this.redis.connect().catch(() => undefined);
      await this.redis.ping();
    });
  }

  private async withTimeout(operation: () => Promise<void>): Promise<ProbeResult> {
    const startedAt = Date.now();
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('probe timeout')), PROBE_TIMEOUT_MS);
        }),
      ]);
      return { status: 'ok', durationMs: Date.now() - startedAt };
    } catch (err) {
      return {
        status: 'fail',
        durationMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
