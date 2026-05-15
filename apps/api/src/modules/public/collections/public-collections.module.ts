import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../platform/prisma/prisma.module';
import { PublicCollectionsController } from './public-collections.controller';
import { PublicCollectionsService } from './public-collections.service';

@Module({
  imports: [PrismaModule],
  controllers: [PublicCollectionsController],
  providers: [PublicCollectionsService],
})
export class PublicCollectionsModule {}
