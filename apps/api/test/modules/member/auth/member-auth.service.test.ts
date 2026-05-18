import * as assert from 'node:assert/strict';
import * as jwt from 'jsonwebtoken';
import { test } from 'vitest';
import { MemberStatus, WechatChannelType } from '@prisma/client';
import { MemberContextService } from '../../../../src/modules/member/auth/member-context.service';
import { MemberAuthService } from '../../../../src/modules/member/auth/member-auth.service';
import { BizError } from '../../../../src/common/http/biz-error';

function createMemberAuthPrismaMock() {
  const members: Array<{
    id: string;
    memberNo: string;
    nickname: string;
    avatarUrl: string | null;
    mobile: string | null;
    status: MemberStatus;
    registeredAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  const bindings: Array<{
    id: string;
    memberId: string;
    channelType: WechatChannelType;
    openid: string;
    unionid: string | null;
    boundAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  let memberSeq = 0;
  let bindingSeq = 0;

  const tx = {
    member: {
      count: async () => members.length,
      findUnique: async ({
        where,
      }: {
        where: { memberNo?: string; id?: string };
      }) => {
        const attachCount = (
          member: (typeof members)[number] | null,
        ) =>
          member
            ? {
                ...member,
                _count: {
                  wechatBindings: bindings.filter((item) => item.memberId === member.id).length,
                  ownedCollections: 0,
                  comments: 0,
                },
              }
            : null;

        if (where.memberNo) {
          return attachCount(
            members.find((item) => item.memberNo === where.memberNo) ?? null,
          );
        }

        if (where.id) {
          return attachCount(members.find((item) => item.id === where.id) ?? null);
        }

        return null;
      },
      create: async ({
        data,
      }: {
        data: {
          memberNo: string;
          nickname: string;
          avatarUrl: string | null;
          status: MemberStatus;
        };
      }) => {
        memberSeq += 1;
        const now = new Date('2026-05-14T03:00:00.000Z');
        const record = {
          id: `mem_${memberSeq}`,
          memberNo: data.memberNo,
          nickname: data.nickname,
          avatarUrl: data.avatarUrl,
          mobile: null,
          status: data.status,
          registeredAt: now,
          createdAt: now,
          updatedAt: now,
        };
        members.push(record);
        return record;
      },
    },
    memberWechatBinding: {
      create: async ({
        data,
      }: {
        data: {
          memberId: string;
          channelType: WechatChannelType;
          openid: string;
        };
      }) => {
        bindingSeq += 1;
        const now = new Date('2026-05-14T03:00:00.000Z');
        const record = {
          id: `bind_${bindingSeq}`,
          memberId: data.memberId,
          channelType: data.channelType,
          openid: data.openid,
          unionid: null,
          boundAt: now,
          createdAt: now,
          updatedAt: now,
        };
        bindings.push(record);
        return record;
      },
    },
  };

  const prisma = {
    member: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const member = members.find((item) => item.id === where.id) ?? null;
        if (!member) {
          return null;
        }

        return {
          ...member,
          _count: {
            wechatBindings: bindings.filter((item) => item.memberId === member.id).length,
            ownedCollections: 0,
            comments: 0,
          },
        };
      },
    },
    memberWechatBinding: {
      findUnique: async ({
        where,
      }: {
        where: {
          channelType_openid: {
            channelType: WechatChannelType;
            openid: string;
          };
        };
      }) => {
        const binding = bindings.find(
          (item) =>
            item.channelType === where.channelType_openid.channelType &&
            item.openid === where.channelType_openid.openid,
        );

        if (!binding) {
          return null;
        }

        const member = members.find((item) => item.id === binding.memberId);

        return member ? { ...binding, member } : null;
      },
    },
    $transaction: async <T>(callback: (client: typeof tx) => Promise<T>) => callback(tx),
  };

  return { prisma, members, bindings };
}

test('MemberAuthService.loginWithWechatMiniapp creates member and binding for first login', async () => {
  const { prisma, members, bindings } = createMemberAuthPrismaMock();
  const memberContextService = new MemberContextService(prisma as never);
  const service = new MemberAuthService(prisma as never, memberContextService);

  const result = await service.loginWithWechatMiniapp({
    code: 'wx-code-001',
  });
  const payload = jwt.verify(
    result.accessToken,
    'dev-member-jwt-secret-change-me',
  ) as { sub: string; typ: string };

  assert.equal(members.length, 1);
  assert.equal(bindings.length, 1);
  assert.equal(payload.sub, members[0]?.id);
  assert.equal(payload.typ, 'member');
  assert.equal(result.member.id, members[0]?.id);
  assert.equal(result.member.memberNo, 'MEM000001');
  assert.equal(result.member.status, MemberStatus.ACTIVE);
  assert.equal(result.member.mobile, null);
  assert.equal(result.member.wechatBindingCount, 1);
  assert.equal(result.member.ownedCollectionCount, 0);
  assert.equal(result.member.commentCount, 0);
  assert.equal(result.member.registeredAt, new Date('2026-05-14T03:00:00.000Z').getTime());
});

test('MemberAuthService.loginWithWechatMp creates mp binding for first login', async () => {
  const { prisma, members, bindings } = createMemberAuthPrismaMock();
  const memberContextService = new MemberContextService(prisma as never);
  const service = new MemberAuthService(prisma as never, memberContextService);

  const result = await service.loginWithWechatMp({
    code: 'mp-code-001',
  });

  assert.equal(members.length, 1);
  assert.equal(bindings.length, 1);
  assert.equal(bindings[0]?.channelType, WechatChannelType.MP);
  assert.equal(result.member.memberNo, 'MEM000001');
});

test('MemberAuthService.getCurrentMember supports bearer jwt token', async () => {
  const { prisma, members } = createMemberAuthPrismaMock();
  const memberContextService = new MemberContextService(prisma as never);
  const service = new MemberAuthService(prisma as never, memberContextService);
  const loginResult = await service.loginWithWechatMiniapp({
    code: 'wx-code-002',
  });

  const currentMember = await service.getCurrentMember({
    authorization: `Bearer ${loginResult.accessToken}`,
  });

  assert.equal(currentMember.id, members[0]?.id);
  assert.equal(currentMember.memberNo, 'MEM000001');
  assert.equal(currentMember.wechatBindingCount, 1);
  assert.equal(currentMember.ownedCollectionCount, 0);
  assert.equal(currentMember.commentCount, 0);
});

test('MemberAuthService.getCurrentMember rejects when auth context is missing', async () => {
  const { prisma } = createMemberAuthPrismaMock();
  const memberContextService = new MemberContextService(prisma as never);
  const service = new MemberAuthService(prisma as never, memberContextService);

  await assert.rejects(
    () => service.getCurrentMember({}),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'UNAUTHORIZED' &&
      error.status === 401,
  );
});

test('MemberContextService rejects x-member-id-only auth context', async () => {
  const { prisma, members } = createMemberAuthPrismaMock();
  const memberContextService = new MemberContextService(prisma as never);
  const memberAuthService = new MemberAuthService(prisma as never, memberContextService);

  await memberAuthService.loginWithWechatMiniapp({
    code: 'wx-code-003',
  });

  await assert.rejects(
    () =>
      memberContextService.getCurrentActiveMember({
        memberId: members[0]?.id,
      }),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'UNAUTHORIZED' &&
      error.status === 401,
  );
});

test('MemberContextService rejects frozen member context', async () => {
  const { prisma, members } = createMemberAuthPrismaMock();
  const memberContextService = new MemberContextService(prisma as never);
  const memberAuthService = new MemberAuthService(prisma as never, memberContextService);

  const loginResult = await memberAuthService.loginWithWechatMiniapp({
    code: 'wx-code-frozen',
  });

  if (!members[0]) {
    throw new Error('expected seeded member');
  }

  members[0].status = MemberStatus.FROZEN;

  await assert.rejects(
    () =>
      memberContextService.getCurrentActiveMember({
        authorization: `Bearer ${loginResult.accessToken}`,
      }),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'MEMBER_ACCOUNT_FROZEN' &&
      error.message === 'member account frozen',
  );
});
