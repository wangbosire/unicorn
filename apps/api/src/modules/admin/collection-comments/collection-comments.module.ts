import { Module } from '@nestjs/common';
import { CollectionCommentsController } from './collection-comments.controller';
import { CollectionCommentsService } from './collection-comments.service';
import { PrismaModule } from '../../../platform/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CollectionCommentsController],
  providers: [CollectionCommentsService],
  exports: [CollectionCommentsService],
})
export class CollectionCommentsModule {}
