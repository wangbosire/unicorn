import * as assert from 'node:assert/strict';
import {
  NotificationChannel,
  NotificationDispatchStatus,
  NotificationMessageType,
} from '@prisma/client';
import { test } from 'vitest';
import { InAppChannel } from '../../../src/modules/notifications/channels/in-app.channel';
import { MiniappSubscriptionChannel } from '../../../src/modules/notifications/channels/miniapp-subscription.channel';
import { WechatMpChannel } from '../../../src/modules/notifications/channels/wechat-mp.channel';
import { NotificationProcessor } from '../../../src/modules/notifications/notification.processor';

interface DispatchRecord {
  messageId: string;
  channel: NotificationChannel;
  status: NotificationDispatchStatus;
  providerResponse?: string | null;
  sentAt?: Date | null;
}

function createPrismaMock(message: {
  id: string;
  memberId: string;
  messageType: NotificationMessageType;
  title: string;
  content: string;
}) {
  const records: DispatchRecord[] = [];
  return {
    records,
    prisma: {
      notificationMessage: {
        findUnique: async () => message,
      },
      notificationDispatchRecord: {
        create: async ({ data }: { data: DispatchRecord }) => {
          records.push({ ...data });
          return data;
        },
      },
    },
  };
}

function createMessage() {
  return {
    id: 'msg_1',
    memberId: 'mem_1',
    messageType: NotificationMessageType.ACTIVATE_SUCCESS,
    title: '激活成功',
    content: '你的藏品 COL-0001 已激活',
  };
}

test('NotificationProcessor.process writes SENT record on success', async () => {
  const message = createMessage();
  const { prisma, records } = createPrismaMock(message);
  const processor = new NotificationProcessor(
    prisma as never,
    new InAppChannel(),
    new MiniappSubscriptionChannel(),
    new WechatMpChannel(),
  );

  await processor.process({
    data: { messageId: message.id, channel: NotificationChannel.IN_APP },
  } as never);

  assert.equal(records.length, 1);
  assert.equal(records[0]?.channel, NotificationChannel.IN_APP);
  assert.equal(records[0]?.status, NotificationDispatchStatus.SENT);
  assert.ok(records[0]?.sentAt instanceof Date);
});

test('NotificationProcessor.process writes FAILED record and rethrows on channel error', async () => {
  const message = createMessage();
  const { prisma, records } = createPrismaMock(message);
  const failingChannel = new MiniappSubscriptionChannel();
  failingChannel.send = async () => {
    throw new Error('upstream timeout');
  };
  const processor = new NotificationProcessor(
    prisma as never,
    new InAppChannel(),
    failingChannel,
    new WechatMpChannel(),
  );

  await assert.rejects(
    () =>
      processor.process({
        data: { messageId: message.id, channel: NotificationChannel.MINIAPP_SUBSCRIPTION },
      } as never),
    /upstream timeout/,
  );
  assert.equal(records.length, 1);
  assert.equal(records[0]?.status, NotificationDispatchStatus.FAILED);
  assert.equal(records[0]?.providerResponse, 'upstream timeout');
});

test('NotificationProcessor.process skips when message missing', async () => {
  const prisma = {
    notificationMessage: { findUnique: async () => null },
    notificationDispatchRecord: {
      create: async () => {
        throw new Error('should not be called');
      },
    },
  };
  const processor = new NotificationProcessor(
    prisma as never,
    new InAppChannel(),
    new MiniappSubscriptionChannel(),
    new WechatMpChannel(),
  );

  await processor.process({
    data: { messageId: 'missing', channel: NotificationChannel.IN_APP },
  } as never);
});
