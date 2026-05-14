import { Controller, Get } from '@nestjs/common';

@Controller('member-api')
export class MemberApiController {
  @Get('health')
  getHealth() {
    return { scope: 'member-api', status: 'ok' };
  }
}
