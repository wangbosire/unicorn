import * as assert from 'node:assert/strict';
import { NotificationChannel, NotificationMessageType } from '@prisma/client';
import { test } from 'vitest';
import { NotificationDispatcherService } from '../../../src/modules/notifications/notification-dispatcher.service';

interface QueuedJob {
  name: string;
  data: { messageId: string; channel: NotificationChannel };
}

function createMocks() {
  const messages: Array<{
    id: string;
    memberId: string;
    messageType: NotificationMessageType;
    title: string;
    content: string;
  }> = [];
  let nextId = 1;
  const queued: QueuedJob[] = [];

  const prisma = {
    notificationMessage: {
      create: async ({ data }: { data: Omit<(typeof messages)[number], 'id'> }) => {
        const row = { id: `msg_${nextId++}`, ...data };
        messages.push(row);
        return row;
      },
    },
  };

  const queue = {
    add: async (name: string, data: QueuedJob['data']) => {
      queued.push({ name, data });
      return { id: 'job-id' };
    },
  };

  return { prisma, queue, messages, queued };
}

test('NotificationDispatcherService.dispatch creates message and enqueues per-channel jobs', async () => {
  const { prisma, queue, messages, queued } = createMocks();
  const service = new NotificationDispatcherService(prisma as never, queue as never);

  const result = await service.dispatch({
    memberId: 'mem_1',
    messageType: NotificationMessageType.ACTIVATE_SUCCESS,
    payload: { collectionName: 'COL-0001' },
  });

  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.memberId, 'mem_1');
  assert.equal(messages[0]?.messageType, NotificationMessageType.ACTIVATE_SUCCESS);
  assert.ok(messages[0]?.content.includes('COL-0001'));
  assert.equal(result.id, messages[0]?.id);
  assert.equal(queued.length, 1);
  assert.equal(queued[0]?.data.messageId, messages[0]?.id);
  assert.equal(queued[0]?.data.channel, NotificationChannel.IN_APP);
});

test('NotificationDispatcherService.dispatch honors explicit channels override', async () => {
  const { prisma, queue, queued } = createMocks();
  const service = new NotificationDispatcherService(prisma as never, queue as never);

  await service.dispatch({
    memberId: 'mem_1',
    messageType: NotificationMessageType.TRANSFER_PENDING_ACCEPT,
    payload: { collectionName: 'COL-1', fromMemberNo: 'MEM-X' },
    channels: [NotificationChannel.IN_APP, NotificationChannel.MINIAPP_SUBSCRIPTION],
  });

  const channels = queued.map((j) => j.data.channel).sort();
  assert.deepEqual(channels, [
    NotificationChannel.IN_APP,
    NotificationChannel.MINIAPP_SUBSCRIPTION,
  ]);
});

test('NotificationDispatcherService.dispatch interpolates placeholders from payload', async () => {
  const { prisma, queue, messages } = createMocks();
  const service = new NotificationDispatcherService(prisma as never, queue as never);

  await service.dispatch({
    memberId: 'mem_2',
    messageType: NotificationMessageType.CONTENT_REJECTED,
    payload: { collectionName: 'COL-2', reason: '内容含违规词' },
  });

  assert.ok(messages[0]?.content.includes('COL-2'));
  assert.ok(messages[0]?.content.includes('内容含违规词'));
});
