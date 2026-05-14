import { Controller, Get } from '@nestjs/common';

@Controller('admin-api')
export class AdminApiController {
  @Get('health')
  getHealth() {
    return { scope: 'admin-api', status: 'ok' };
  }
}
