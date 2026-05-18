import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import { MemberMessagesService } from '../../../../src/modules/member/messages/member-messages.service';

test('MemberMessagesService.listMemberMessages returns paginated items', async () => {
  const memberContextService = {
    getCurrentActiveMember: async () => ({
      id: 'mem_1',
    }),
  };

  const rows = [
    {
      id: 'msg_1',
      memberId: 'mem_1',
      messageType: 'ACTIVATE_SUCCESS',
      title: '激活成功',
      content: '你的藏品已到账',
      readAt: null,
      createdAt: new Date('2026-05-18T09:00:00.000Z'),
    },
    {
      id: 'msg_2',
      memberId: 'mem_1',
      messageType: 'CONTENT_TAKEDOWN',
      title: '内容已下架',
      content: '请返回编辑页查看',
      readAt: new Date('2026-05-18T10:00:00.000Z'),
      createdAt: new Date('2026-05-18T09:30:00.000Z'),
    },
  ];

  const prisma = {
    notificationMessage: {
      findMany: async () => rows,
      count: async () => 2,
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };

  const service = new MemberMessagesService(prisma as never, memberContextService as never);
  const result = await service.listMemberMessages(
    { authorization: 'Bearer member.jwt.token' },
    { page: '1', pageSize: '20' },
  );

  assert.equal(result.total, 2);
  assert.equal(result.items[0]?.id, 'msg_1');
  assert.equal(result.items[0]?.isRead, false);
  assert.equal(result.items[1]?.isRead, true);
});

test('MemberMessagesService.markMemberMessageRead updates read state', async () => {
  const memberContextService = {
    getCurrentActiveMember: async () => ({
      id: 'mem_1',
    }),
  };

  const prisma = {
    notificationMessage: {
      findUnique: async () => ({
        id: 'msg_1',
        memberId: 'mem_1',
        readAt: null,
      }),
      update: async ({ where, data }: { where: { id: string }; data: { readAt: Date } }) => ({
        id: where.id,
        readAt: data.readAt,
      }),
    },
  };

  const service = new MemberMessagesService(prisma as never, memberContextService as never);
  const result = await service.markMemberMessageRead(
    { authorization: 'Bearer member.jwt.token' },
    { messageId: 'msg_1' },
  );

  assert.equal(result.id, 'msg_1');
  assert.equal(result.isRead, true);
  assert.equal(typeof result.readAt, 'number');
});
