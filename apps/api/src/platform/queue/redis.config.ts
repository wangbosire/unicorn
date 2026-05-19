import type { RedisOptions } from 'ioredis';

const DEFAULT_REDIS_URL = 'redis://127.0.0.1:6380';

/// 把 `redis://user:pass@host:port/db` 形式的 URL 转成 ioredis 选项。
/// BullMQ Worker 要求 `maxRetriesPerRequest = null`，统一关闭以避免运行时报错。
export function parseRedisUrl(url: string | undefined): RedisOptions {
  const target = url && url.length > 0 ? url : DEFAULT_REDIS_URL;
  const parsed = new URL(target);
  const dbSegment = parsed.pathname.replace(/^\//, '');
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: dbSegment ? Number(dbSegment) : 0,
    maxRetriesPerRequest: null,
  };
}
