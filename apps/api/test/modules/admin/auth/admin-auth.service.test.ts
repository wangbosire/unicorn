import * as assert from 'node:assert/strict';
import { ConfigService } from '@nestjs/config';
import { test } from 'vitest';
import { AdminUserStatus, RoleStatus } from '@prisma/client';
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

test('AdminAuthService.logout returns success confirmation', () => {
  const prisma = {} as unknown as PrismaService;
  const config = {
    get: () => 'dev-admin-jwt-secret-change-me',
  } as unknown as ConfigService;
  const service = new AdminAuthService(prisma, config);

  assert.deepEqual(service.logout(), { success: true });
});

test('AdminAuthService.buildMeResponseHydrated returns enriched admin user summary', async () => {
  const prisma = {
    adminUser: {
      findUnique: async () => ({
        id: 'admin_1',
        accountNo: 'ADM-001',
        username: 'root',
        displayName: '超级管理员',
        passwordHash: 'hash',
        status: AdminUserStatus.ACTIVE,
        lastLoginAt: new Date('2026-05-18T08:00:00.000Z'),
        createdAt: new Date('2026-05-18T07:00:00.000Z'),
        updatedAt: new Date('2026-05-18T08:00:00.000Z'),
        reviewedItems: [{ id: 'rev_1' }, { id: 'rev_2' }],
        reviewedComments: [{ id: 'cmt_rev_1' }],
        roles: [
          {
            role: {
              roleKey: 'super_admin',
              roleName: '超级管理员',
              status: RoleStatus.ENABLED,
              permissions: [
                {
                  permission: {
                    permissionKey: '*',
                  },
                },
              ],
            },
          },
        ],
      }),
    },
  } as unknown as PrismaService;
  const config = {
    get: () => 'dev-admin-jwt-secret-change-me',
  } as unknown as ConfigService;
  const service = new AdminAuthService(prisma, config);

  const result = await service.buildMeResponseHydrated({
    id: 'admin_1',
    username: 'root',
    accountNo: 'ADM-001',
    permissionKeys: ['*'],
  });

  assert.equal(result.user.status, AdminUserStatus.ACTIVE);
  assert.equal(result.user.lastLoginAt, new Date('2026-05-18T08:00:00.000Z').getTime());
  assert.deepEqual(result.user.roleNames, ['超级管理员']);
  assert.equal(result.user.reviewedContentCount, 2);
  assert.equal(result.user.reviewedCommentCount, 1);
});
