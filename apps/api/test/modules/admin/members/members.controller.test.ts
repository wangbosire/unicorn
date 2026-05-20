import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import { BizError } from '../../../../src/common/http/biz-error';
import { MembersController } from '../../../../src/modules/admin/members/members.controller';

test('MembersController.updateMemberStatus uses freeze permission for FROZEN target status', async () => {
  const receivedCalls: Array<{ memberId: string; body: unknown }> = [];
  const controller = new MembersController({
    updateMemberStatus: async (memberId: string, body: unknown) => {
      receivedCalls.push({ memberId, body });
      return {
        memberId: 'm1',
        memberNo: 'MEM-001',
        status: 'FROZEN',
        updatedAt: 1_716_000_000_000,
      };
    },
  } as never);

  const result = await controller.updateMemberStatus(
    'm1',
    { status: 'FROZEN' },
    {
      admin: {
        permissionKeys: ['members.freeze'],
      },
    } as never,
  );

  assert.equal(result.status, 'FROZEN');
  assert.deepEqual(receivedCalls, [
    {
      memberId: 'm1',
      body: { status: 'FROZEN' },
    },
  ]);
});

test('MembersController.updateMemberStatus uses unfreeze permission for ACTIVE target status', async () => {
  const receivedCalls: Array<{ memberId: string; body: unknown }> = [];
  const controller = new MembersController({
    updateMemberStatus: async (memberId: string, body: unknown) => {
      receivedCalls.push({ memberId, body });
      return {
        memberId: 'm1',
        memberNo: 'MEM-001',
        status: 'ACTIVE',
        updatedAt: 1_716_000_000_000,
      };
    },
  } as never);

  const result = await controller.updateMemberStatus(
    'm1',
    { status: 'ACTIVE' },
    {
      admin: {
        permissionKeys: ['members.unfreeze'],
      },
    } as never,
  );

  assert.equal(result.status, 'ACTIVE');
  assert.deepEqual(receivedCalls, [
    {
      memberId: 'm1',
      body: { status: 'ACTIVE' },
    },
  ]);
});

test('MembersController.updateMemberStatus rejects when target status permission is missing', async () => {
  const controller = new MembersController({
    updateMemberStatus: async () => {
      throw new Error('not used');
    },
  } as never);

  await assert.rejects(
    () =>
      controller.updateMemberStatus(
        'm1',
        { status: 'FROZEN' },
        {
          admin: {
            permissionKeys: ['members.read'],
          },
        } as never,
      ),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'ADMIN_AUTH_FORBIDDEN' &&
      error.status === 403,
  );
});
