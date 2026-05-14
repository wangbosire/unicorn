import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminApiModule } from './app/admin-api/admin-api.module';
import { MemberApiModule } from './app/member-api/member-api.module';
import { PublicApiModule } from './app/public-api/public-api.module';
import { PrismaModule } from './platform/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AdminApiModule,
    MemberApiModule,
    PublicApiModule,
  ],
})
export class AppModule {}
