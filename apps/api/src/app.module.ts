import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminApiModule } from './app/admin-api/admin-api.module';
import { MemberApiModule } from './app/member-api/member-api.module';
import { PublicApiModule } from './app/public-api/public-api.module';
import { AdminAuthModule } from './modules/admin/auth/admin-auth.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ObservabilityModule } from './common/observability/observability.module';
import { PrismaModule } from './platform/prisma/prisma.module';
import { QueueModule } from './platform/queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ObservabilityModule,
    PrismaModule,
    QueueModule,
    NotificationsModule,
    AdminAuthModule,
    AdminApiModule,
    MemberApiModule,
    PublicApiModule,
  ],
})
export class AppModule {}
