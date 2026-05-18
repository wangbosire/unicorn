import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { parseRedisUrl } from './redis.config';

/// 全局 BullMQ 连接根模块。
///
/// 各业务模块通过 `BullModule.registerQueue({ name })` 注册自己的队列，
/// 队列名集中在 `queue.constants.ts` 维护。
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: parseRedisUrl(config.get<string>('REDIS_URL')),
      }),
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
