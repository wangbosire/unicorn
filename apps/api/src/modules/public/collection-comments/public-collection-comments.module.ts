import { Module } from '@nestjs/common';
import { PublicCollectionCommentsController } from './public-collection-comments.controller';
import { PublicCollectionCommentsService } from './public-collection-comments.service';
import { PrismaModule } from '../../../platform/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PublicCollectionCommentsController],
  providers: [PublicCollectionCommentsService],
  exports: [PublicCollectionCommentsService],
})
export class PublicCollectionCommentsModule {}
