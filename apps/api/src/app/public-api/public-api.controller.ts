import { Controller, Get, HttpCode, HttpStatus, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthProbeService } from '../../common/observability/health-probe.service';

@Controller('public-api')
export class PublicApiController {
  constructor(private readonly healthProbeService: HealthProbeService) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async getHealth(@Query('deep') deep: string | undefined, @Res({ passthrough: true }) res: Response) {
    if (!isTruthyQueryFlag(deep)) {
      return { scope: 'public-api', status: 'ok' };
    }
    const probe = await this.healthProbeService.probe();
    if (probe.status === 'fail') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return {
      scope: 'public-api',
      status: probe.status,
      mysql: probe.mysql,
      redis: probe.redis,
    };
  }
}

function isTruthyQueryFlag(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}
