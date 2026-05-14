import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { ActivationCodeStatus, CollectionStatus, IssuanceBatchStatus, SeriesStatus } from '@prisma/client';
import { ActivationCodesService } from '../../../../src/modules/issuance/activation-codes/activation-codes.service';
import { BizError } from '../../../../src/common/http/biz-error';

function createActivationCodesPrismaMock() {
  const batches: Array<{
    id: string;
    batchNo: string;
    seriesId: string;
    name: string;
    quantity: number;
    activateValidFrom: Date;
    activateValidTo: Date;
    status: IssuanceBatchStatus;
    remark: null;
    createdAt: Date;
    updatedAt: Date;
    series: { id: string; status: SeriesStatus };
  }> = [
    {
      id: 'bat_1',
      batchNo: 'BAT-001',
      seriesId: 'ser_1',
      name: '第一批',
      quantity: 3,
      activateValidFrom: new Date('2026-05-14T00:00:00.000Z'),
      activateValidTo: new Date('2026-06-14T00:00:00.000Z'),
      status: IssuanceBatchStatus.ENABLED,
      remark: null,
      createdAt: new Date('2026-05-14T00:00:00.000Z'),
      updatedAt: new Date('2026-05-14T00:00:00.000Z'),
      series: { id: 'ser_1', status: SeriesStatus.ENABLED },
    },
  ];

  const collections: Array<{
    id: string;
    collectionNo: string;
    seriesId: string;
    batchId: string;
    status: CollectionStatus;
    currentOwnerMemberId: string | null;
    claimedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  const activationCodes: Array<{
    id: string;
    code: string;
    batchId: string;
    collectionId: string;
    status: ActivationCodeStatus;
    issuedChannel: string | null;
    issuedAt: Date | null;
    usedByMemberId: string | null;
    usedAt: Date | null;
    expiredAt: Date | null;
    voidedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  let collectionSeq = 0;
  let activationCodeSeq = 0;

  const tx = {
    activationCode: {
      count: async ({ where }: { where: { batchId: string } }) =>
        activationCodes.filter((item) => item.batchId === where.batchId).length,
      findUnique: async ({ where }: { where: { code: string } }) =>
        activationCodes.find((item) => item.code === where.code) ?? null,
      create: async ({
        data,
      }: {
        data: {
          code: string;
          batchId: string;
          collectionId: string;
          status: ActivationCodeStatus;
          issuedChannel: string;
          expiredAt: Date;
        };
      }) => {
        activationCodeSeq += 1;
        const now = new Date('2026-05-14T01:00:00.000Z');
        const record = {
          id: `ac_${activationCodeSeq}`,
          code: data.code,
          batchId: data.batchId,
          collectionId: data.collectionId,
          status: data.status,
          issuedChannel: data.issuedChannel,
          issuedAt: null,
          usedByMemberId: null,
          usedAt: null,
          expiredAt: data.expiredAt,
          voidedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        activationCodes.push(record);
        return record;
      },
    },
    collection: {
      findUnique: async ({ where }: { where: { collectionNo: string } }) =>
        collections.find((item) => item.collectionNo === where.collectionNo) ?? null,
      create: async ({
        data,
      }: {
        data: {
          collectionNo: string;
          seriesId: string;
          batchId: string;
          status: CollectionStatus;
        };
      }) => {
        collectionSeq += 1;
        const now = new Date('2026-05-14T01:00:00.000Z');
        const record = {
          id: `col_${collectionSeq}`,
          collectionNo: data.collectionNo,
          seriesId: data.seriesId,
          batchId: data.batchId,
          status: data.status,
          currentOwnerMemberId: null,
          claimedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        collections.push(record);
        return record;
      },
    },
  };

  const prisma = {
    issuanceBatch: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        batches.find((item) => item.id === where.id) ?? null,
    },
    activationCode: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        activationCodes.find((item) => item.id === where.id) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: {
          status?: ActivationCodeStatus;
          voidedAt?: Date | null;
        };
      }) => {
        const item = activationCodes.find((c) => c.id === where.id);
        if (!item) {
          throw new Error('activation code not found');
        }
        if (data.status !== undefined) {
          item.status = data.status;
        }
        if (data.voidedAt !== undefined) {
          item.voidedAt = data.voidedAt;
        }
        item.updatedAt = new Date('2026-05-14T02:00:00.000Z');
        return { ...item };
      },
    },
    $transaction: async <T>(callback: (client: typeof tx) => Promise<T>) => callback(tx),
  };

  return { prisma, activationCodes, collections, batches };
}

test('ActivationCodesService.generateActivationCodes creates activation codes and collections in pairs', async () => {
  const { prisma, activationCodes, collections } = createActivationCodesPrismaMock();
  const service = new ActivationCodesService(prisma as never);

  const result = await service.generateActivationCodes({
    batchId: 'bat_1',
    count: 2,
    issuedChannel: 'offline_event',
  });

  assert.equal(result.batchId, 'bat_1');
  assert.equal(result.generatedCount, 2);
  assert.equal(result.activationCodes.length, 2);
  assert.equal(activationCodes.length, 2);
  assert.equal(collections.length, 2);
  assert.deepEqual(
    activationCodes.map((item) => item.collectionId),
    collections.map((item) => item.id),
  );
  assert.ok(
    activationCodes.every((item) => item.status === ActivationCodeStatus.UNISSUED),
  );
  assert.ok(collections.every((item) => item.status === CollectionStatus.PENDING_CLAIM));
});

test('ActivationCodesService.generateActivationCodes rejects when generation exceeds batch quantity', async () => {
  const { prisma } = createActivationCodesPrismaMock();
  const service = new ActivationCodesService(prisma as never);

  await assert.rejects(
    () =>
      service.generateActivationCodes({
        batchId: 'bat_1',
        count: 4,
        issuedChannel: 'offline_event',
      }),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'ACTIVATION_CODE_GENERATION_EXCEEDS_BATCH_QUANTITY',
  );
});

test('ActivationCodesService.generateActivationCodes rejects when issuance batch is disabled', async () => {
  const { prisma, batches } = createActivationCodesPrismaMock();
  batches[0]!.status = IssuanceBatchStatus.DISABLED;
  const service = new ActivationCodesService(prisma as never);

  await assert.rejects(
    () =>
      service.generateActivationCodes({
        batchId: 'bat_1',
        count: 1,
        issuedChannel: 'offline_event',
      }),
    (error: unknown) =>
      error instanceof BizError && error.code === 'ISSUANCE_BATCH_DISABLED',
  );
});

test('ActivationCodesService.generateActivationCodes rejects when parent series is disabled', async () => {
  const { prisma, batches } = createActivationCodesPrismaMock();
  batches[0]!.series.status = SeriesStatus.DISABLED;
  const service = new ActivationCodesService(prisma as never);

  await assert.rejects(
    () =>
      service.generateActivationCodes({
        batchId: 'bat_1',
        count: 1,
        issuedChannel: 'offline_event',
      }),
    (error: unknown) =>
      error instanceof BizError && error.code === 'SERIES_DISABLED',
  );
});

test('ActivationCodesService.generateActivationCodes rejects when issuance batch does not exist', async () => {
  const { prisma } = createActivationCodesPrismaMock();
  const service = new ActivationCodesService(prisma as never);

  await assert.rejects(
    () =>
      service.generateActivationCodes({
        batchId: 'bat_missing',
        count: 1,
        issuedChannel: 'offline_event',
      }),
    (error: unknown) =>
      error instanceof BizError && error.code === 'ISSUANCE_BATCH_NOT_FOUND',
  );
});

function seedVoidableActivationCode(
  activationCodes: Array<{
    id: string;
    code: string;
    batchId: string;
    collectionId: string;
    status: ActivationCodeStatus;
    issuedChannel: string | null;
    issuedAt: Date | null;
    usedByMemberId: string | null;
    usedAt: Date | null;
    expiredAt: Date | null;
    voidedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>,
  status: ActivationCodeStatus = ActivationCodeStatus.UNISSUED,
) {
  const now = new Date('2026-05-14T01:00:00.000Z');
  activationCodes.push({
    id: 'ac_void_1',
    code: 'ZZZZ-YYYY-XXXX',
    batchId: 'bat_1',
    collectionId: 'col_void_1',
    status,
    issuedChannel: 'offline_event',
    issuedAt: null,
    usedByMemberId: null,
    usedAt: null,
    expiredAt: new Date('2026-06-14T00:00:00.000Z'),
    voidedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

test('ActivationCodesService.voidActivationCode marks UNISSUED code as VOIDED', async () => {
  const { prisma, activationCodes } = createActivationCodesPrismaMock();
  seedVoidableActivationCode(activationCodes, ActivationCodeStatus.UNISSUED);
  const service = new ActivationCodesService(prisma as never);

  const result = await service.voidActivationCode('ac_void_1');

  assert.equal(result.status, ActivationCodeStatus.VOIDED);
  assert.equal(result.code, 'ZZZZ-YYYY-XXXX');
  assert.ok(activationCodes[0]?.voidedAt);
  assert.equal(activationCodes[0]?.status, ActivationCodeStatus.VOIDED);
});

test('ActivationCodesService.voidActivationCode allows ISSUED code', async () => {
  const { prisma, activationCodes } = createActivationCodesPrismaMock();
  seedVoidableActivationCode(activationCodes, ActivationCodeStatus.ISSUED);
  const service = new ActivationCodesService(prisma as never);

  const result = await service.voidActivationCode('ac_void_1');

  assert.equal(result.status, ActivationCodeStatus.VOIDED);
});

test('ActivationCodesService.voidActivationCode rejects when code not found', async () => {
  const { prisma } = createActivationCodesPrismaMock();
  const service = new ActivationCodesService(prisma as never);

  await assert.rejects(
    () => service.voidActivationCode('ac_missing'),
    (error: unknown) =>
      error instanceof BizError && error.code === 'ACTIVATION_CODE_NOT_FOUND',
  );
});

test('ActivationCodesService.voidActivationCode rejects when already USED', async () => {
  const { prisma, activationCodes } = createActivationCodesPrismaMock();
  seedVoidableActivationCode(activationCodes, ActivationCodeStatus.USED);
  const service = new ActivationCodesService(prisma as never);

  await assert.rejects(
    () => service.voidActivationCode('ac_void_1'),
    (error: unknown) =>
      error instanceof BizError && error.code === 'ACTIVATION_CODE_CANNOT_VOID_USED',
  );
});

test('ActivationCodesService.voidActivationCode rejects when already VOIDED', async () => {
  const { prisma, activationCodes } = createActivationCodesPrismaMock();
  seedVoidableActivationCode(activationCodes, ActivationCodeStatus.VOIDED);
  const service = new ActivationCodesService(prisma as never);

  await assert.rejects(
    () => service.voidActivationCode('ac_void_1'),
    (error: unknown) =>
      error instanceof BizError && error.code === 'ACTIVATION_CODE_ALREADY_VOIDED',
  );
});

test('ActivationCodesService.voidActivationCode rejects when EXPIRED', async () => {
  const { prisma, activationCodes } = createActivationCodesPrismaMock();
  seedVoidableActivationCode(activationCodes, ActivationCodeStatus.EXPIRED);
  const service = new ActivationCodesService(prisma as never);

  await assert.rejects(
    () => service.voidActivationCode('ac_void_1'),
    (error: unknown) =>
      error instanceof BizError && error.code === 'ACTIVATION_CODE_CANNOT_VOID_EXPIRED',
  );
});
