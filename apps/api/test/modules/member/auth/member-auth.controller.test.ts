import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import { MemberAuthController } from '../../../../src/modules/member/auth/member-auth.controller';

test('MemberAuthController.loginWithWechatMiniapp forwards body to service', async () => {
  const expectedResult = {
    accessToken: 'mock-member-token:mem_1',
    member: {
      id: 'mem_1',
      memberNo: 'MEM-0001',
      nickname: '测试会员',
      avatarUrl: null,
      mobile: null,
      status: 'ACTIVE',
      registeredAt: 1_715_654_400_000,
      wechatBindingCount: 1,
      ownedCollectionCount: 0,
      commentCount: 0,
    },
  };
  const receivedBodies: unknown[] = [];
  const loginWithWechatMiniapp = async (body: unknown) => {
    receivedBodies.push(body);
    return expectedResult;
  };
  const controller = new MemberAuthController({
    loginWithWechatMiniapp,
  } as never);

  const body = {
    code: 'wechat-code',
    nickname: '测试会员',
    avatarUrl: null,
  };
  const result = await controller.loginWithWechatMiniapp(body);

  assert.deepEqual(result, expectedResult);
  assert.equal(receivedBodies.length, 1);
  assert.deepEqual(receivedBodies[0], body);
});

test('MemberAuthController.loginWithWechatMp forwards body to service', async () => {
  const expectedResult = {
    accessToken: 'mock-member-token:mem_2',
    member: {
      id: 'mem_2',
      memberNo: 'MEM-0002',
      nickname: '公众号会员',
      avatarUrl: null,
      mobile: null,
      status: 'ACTIVE',
      registeredAt: 1_715_654_400_000,
      wechatBindingCount: 1,
      ownedCollectionCount: 0,
      commentCount: 0,
    },
  };
  const receivedBodies: unknown[] = [];
  const loginWithWechatMp = async (body: unknown) => {
    receivedBodies.push(body);
    return expectedResult;
  };
  const controller = new MemberAuthController({
    loginWithWechatMp,
  } as never);

  const body = { code: 'mp-code' };
  const result = await controller.loginWithWechatMp(body);

  assert.deepEqual(result, expectedResult);
  assert.deepEqual(receivedBodies, [body]);
});

test('MemberAuthController.getCurrentMember builds auth context from headers', async () => {
  const expectedResult = {
    id: 'mem_1',
    memberNo: 'MEM-0001',
    nickname: '测试会员',
    avatarUrl: null,
    mobile: null,
    status: 'ACTIVE',
    registeredAt: 1_715_654_400_000,
    wechatBindingCount: 1,
    ownedCollectionCount: 0,
    commentCount: 0,
  };
  const receivedAuthContexts: unknown[] = [];
  const getCurrentMember = async (authContext: unknown) => {
    receivedAuthContexts.push(authContext);
    return expectedResult;
  };
  const controller = new MemberAuthController({
    getCurrentMember,
  } as never);

  const result = await controller.getCurrentMember(
    'mem_1',
    'Bearer mock-member-token:mem_1',
  );

  assert.deepEqual(result, expectedResult);
  assert.equal(receivedAuthContexts.length, 1);
  assert.deepEqual(receivedAuthContexts[0], {
    memberId: 'mem_1',
    authorization: 'Bearer mock-member-token:mem_1',
  });
});
