import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';
import { PublicCollectionsModule } from '../../modules/public/collections/public-collections.module';

@Module({
  imports: [PublicCollectionsModule],
  controllers: [PublicApiController],
})
export class PublicApiModule {}
