import { Global, type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { HealthProbeService } from './health-probe.service';
import { RequestIdMiddleware } from './request-id.middleware';

/// 观察性模块。负责挂载请求级追踪中间件，并提供健康探活服务。
/// Logger 在 main.ts 通过 useLogger 设置，不在此处提供。
@Global()
@Module({
  providers: [HealthProbeService],
  exports: [HealthProbeService],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
