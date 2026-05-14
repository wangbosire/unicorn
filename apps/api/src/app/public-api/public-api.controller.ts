import { Controller, Get } from '@nestjs/common';

@Controller('public-api')
export class PublicApiController {
  @Get('health')
  getHealth() {
    return { scope: 'public-api', status: 'ok' };
  }
}
