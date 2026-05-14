import { Module } from '@nestjs/common';
import { IssuanceBatchesController } from './issuance-batches.controller';
import { IssuanceBatchesService } from './issuance-batches.service';

/**
 * 发行批次管理模块。
 */
@Module({
  controllers: [IssuanceBatchesController],
  providers: [IssuanceBatchesService],
  exports: [IssuanceBatchesService],
})
export class IssuanceBatchesModule {}
