import * as assert from 'node:assert/strict';
import { MemberStatus, WechatChannelType } from '@prisma/client';
import { test } from 'vitest';
import { BizError } from '../../../../src/common/http/biz-error';
import { toTimestamp } from '../../../../src/common/serializers/timestamp';
import { MembersService } from '../../../../src/modules/admin/members/members.service';

function createMembersPrismaMock() {
  const members = [
    {
      id: 'm1',
      memberNo: 'MEM-A',
      nickname: 'Alpha',
      mobile: '13800000000',
      status: MemberStatus.ACTIVE,
      registeredAt: new Date('2026-05-10T08:00:00.000Z'),
      wechatBindings: [{ channelType: WechatChannelType.MINIAPP }],
      _count: { ownedCollections: 3 },
    },
    {
      id: 'm2',
      memberNo: 'MEM-B',
      nickname: 'Beta',
      mobile: null,
      status: MemberStatus.FROZEN,
      registeredAt: new Date('2026-05-11T09:00:00.000Z'),
      wechatBindings: [],
      _count: { ownedCollections: 0 },
    },
  ];

  const prisma = {
    member: {
      findMany: async ({
        where,
        skip,
        take,
      }: {
        where: {
          status?: MemberStatus;
          OR?: Array<{ memberNo?: { contains: string }; nickname?: { contains: string } }>;
        };
        skip: number;
        take: number;
      }) => {
        let list = [...members];
        if (where.status) {
          list = list.filter((m) => m.status === where.status);
        }
        const needle =
          where.OR && where.OR.length > 0
            ? String(where.OR[0]?.memberNo?.contains ?? '').toLowerCase()
            : '';
        if (needle) {
          list = list.filter(
            (m) =>
              m.memberNo.toLowerCase().includes(needle) ||
              m.nickname.toLowerCase().includes(needle),
          );
        }
        return list
          .sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime())
          .slice(skip, skip + take);
      },
      count: async ({
        where,
      }: {
        where: {
          status?: MemberStatus;
          OR?: Array<{ memberNo?: { contains: string }; nickname?: { contains: string } }>;
        };
      }) => {
        let list = [...members];
        if (where.status) {
          list = list.filter((m) => m.status === where.status);
        }
        const needle =
          where.OR && where.OR.length > 0
            ? String(where.OR[0]?.memberNo?.contains ?? '').toLowerCase()
            : '';
        if (needle) {
          list = list.filter(
            (m) =>
              m.memberNo.toLowerCase().includes(needle) ||
              m.nickname.toLowerCase().includes(needle),
          );
        }
        return list.length;
      },
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };

  return { prisma };
}

test('MembersService.listMembers returns paginated members', async () => {
  const { prisma } = createMembersPrismaMock();
  const service = new MembersService(prisma as never);

  const result = await service.listMembers({ page: '1', pageSize: '10' });

  assert.equal(result.total, 2);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0]?.memberNo, 'MEM-B');
  assert.equal(result.items[1]?.ownedCollectionsCount, 3);
});

test('MembersService.listMembers filters by status', async () => {
  const { prisma } = createMembersPrismaMock();
  const service = new MembersService(prisma as never);

  const result = await service.listMembers({
    page: '1',
    pageSize: '10',
    status: 'FROZEN',
  });

  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.memberNo, 'MEM-B');
});

test('MembersService.listMembers rejects invalid status', async () => {
  const { prisma } = createMembersPrismaMock();
  const service = new MembersService(prisma as never);

  await assert.rejects(
    () => service.listMembers({ status: 'UNKNOWN' }),
    (e: unknown) => e instanceof BizError && e.code === 'INVALID_MEMBER_STATUS',
  );
});

test('MembersService.updateMemberStatus freezes member', async () => {
  const updatedAt = new Date('2026-05-15T12:00:00.000Z');
  const prisma = {
    member: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === 'm1' ? { id: 'm1', memberNo: 'MEM-A' } : null,
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { status: MemberStatus };
      }) => {
        assert.equal(where.id, 'm1');
        assert.equal(data.status, MemberStatus.FROZEN);
        return {
          id: 'm1',
          memberNo: 'MEM-A',
          status: MemberStatus.FROZEN,
          updatedAt,
        };
      },
    },
  };
  const service = new MembersService(prisma as never);

  const result = await service.updateMemberStatus('m1', { status: 'FROZEN' });

  assert.equal(result.status, 'FROZEN');
  assert.equal(result.memberNo, 'MEM-A');
  assert.equal(result.memberId, 'm1');
  assert.equal(result.updatedAt, toTimestamp(updatedAt));
});

test('MembersService.updateMemberStatus unfreezes member', async () => {
  const updatedAt = new Date('2026-05-16T08:00:00.000Z');
  const prisma = {
    member: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === 'm2' ? { id: 'm2', memberNo: 'MEM-B' } : null,
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { status: MemberStatus };
      }) => {
        assert.equal(data.status, MemberStatus.ACTIVE);
        return {
          id: where.id,
          memberNo: 'MEM-B',
          status: MemberStatus.ACTIVE,
          updatedAt,
        };
      },
    },
  };
  const service = new MembersService(prisma as never);

  const result = await service.updateMemberStatus('m2', { status: 'ACTIVE' });

  assert.equal(result.status, 'ACTIVE');
});

test('MembersService.updateMemberStatus throws when member missing', async () => {
  const prisma = {
    member: {
      findUnique: async () => null,
      update: async () => {
        throw new Error('should not call update');
      },
    },
  };
  const service = new MembersService(prisma as never);

  await assert.rejects(
    () => service.updateMemberStatus('missing', { status: 'FROZEN' }),
    (e: unknown) => e instanceof BizError && e.code === 'MEMBER_NOT_FOUND',
  );
});

test('MembersService.updateMemberStatus rejects blank member id', async () => {
  const prisma = { member: { findUnique: async () => null, update: async () => null } };
  const service = new MembersService(prisma as never);

  await assert.rejects(
    () => service.updateMemberStatus('   ', { status: 'FROZEN' }),
    (e: unknown) => e instanceof BizError && e.code === 'VALIDATION_ERROR',
  );
});

test('MembersService.updateMemberStatus rejects invalid body status', async () => {
  const prisma = { member: { findUnique: async () => null, update: async () => null } };
  const service = new MembersService(prisma as never);

  await assert.rejects(
    () => service.updateMemberStatus('m1', { status: 'UNKNOWN' } as never),
    (e: unknown) => e instanceof BizError && e.code === 'INVALID_MEMBER_STATUS',
  );
});

test('MembersService.updateMemberStatus rejects missing status in body', async () => {
  const prisma = { member: { findUnique: async () => null, update: async () => null } };
  const service = new MembersService(prisma as never);

  await assert.rejects(
    () => service.updateMemberStatus('m1', {} as never),
    (e: unknown) => e instanceof BizError && e.code === 'VALIDATION_ERROR',
  );
});
