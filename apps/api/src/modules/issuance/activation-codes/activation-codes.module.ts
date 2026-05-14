import { Module } from '@nestjs/common';
import { ActivationCodesController } from './activation-codes.controller';
import { ActivationCodesService } from './activation-codes.service';

/**
 * 激活码管理模块。
 */
@Module({
  controllers: [ActivationCodesController],
  providers: [ActivationCodesService],
  exports: [ActivationCodesService],
})
export class ActivationCodesModule {}
