import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import { AdminAuthController } from '../../../../src/modules/admin/auth/admin-auth.controller';

test('AdminAuthController.logout forwards to service', async () => {
  const controller = new AdminAuthController({
    logout: () => ({ success: true as const }),
  } as never);

  const result = await controller.logout();

  assert.deepEqual(result, { success: true });
});

test('AdminAuthController.me forwards hydrated admin context to service', async () => {
  const buildMeResponseHydrated = async (admin: unknown) => {
    assert.deepEqual(admin, {
      id: 'admin_1',
      username: 'root',
      accountNo: 'ADM-001',
      permissionKeys: ['*'],
    });
    return {
      user: {
        id: 'admin_1',
        accountNo: 'ADM-001',
        username: 'root',
        displayName: '超级管理员',
        status: 'ACTIVE',
        lastLoginAt: 1_716_018_800_000,
        roleNames: ['超级管理员'],
        roles: ['super_admin'],
        permissionKeys: ['*'],
        reviewedContentCount: 2,
        reviewedCommentCount: 1,
      },
    };
  };

  const controller = new AdminAuthController({
    buildMeResponseHydrated,
  } as never);

  const result = await controller.me({
    admin: {
      id: 'admin_1',
      username: 'root',
      accountNo: 'ADM-001',
      permissionKeys: ['*'],
    },
  } as never);

  assert.equal(result.user.id, 'admin_1');
  assert.equal(result.user.reviewedCommentCount, 1);
});
