import { Module } from '@nestjs/common';
import { CollectionCommentsController } from './collection-comments.controller';
import { CollectionCommentsService } from './collection-comments.service';
import { PrismaModule } from '../../../platform/prisma/prisma.module';
import { MemberAuthModule } from '../auth/member-auth.module';

@Module({
  imports: [PrismaModule, MemberAuthModule],
  controllers: [CollectionCommentsController],
  providers: [CollectionCommentsService],
  exports: [CollectionCommentsService],
})
export class CollectionCommentsModule {}
