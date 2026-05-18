import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';
import { PublicCollectionCommentsModule } from '../../modules/public/collection-comments/public-collection-comments.module';
import { PublicCollectionsModule } from '../../modules/public/collections/public-collections.module';

@Module({
  imports: [PublicCollectionsModule, PublicCollectionCommentsModule],
  controllers: [PublicApiController],
})
export class PublicApiModule {}
