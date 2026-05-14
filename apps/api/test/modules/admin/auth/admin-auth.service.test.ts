import * as assert from 'node:assert/strict';
import { ConfigService } from '@nestjs/config';
import { test } from 'vitest';
import { BizError } from '../../../../src/common/http/biz-error';
import { AdminAuthService } from '../../../../src/modules/admin/auth/admin-auth.service';
import { PrismaService } from '../../../../src/platform/prisma/prisma.service';

test('AdminAuthService.login throws when user not found', async () => {
  const prisma = {
    adminUser: {
      findUnique: async () => null,
    },
  } as unknown as PrismaService;
  const config = {
    get: () => 'dev-admin-jwt-secret-change-me',
  } as unknown as ConfigService;
  const service = new AdminAuthService(prisma, config);

  await assert.rejects(
    () =>
      service.login({
        username: 'nope',
        password: 'x',
      }),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'ADMIN_AUTH_INVALID_CREDENTIALS',
  );
});
