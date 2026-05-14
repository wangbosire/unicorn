import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import { IssuanceBatchStatus, SeriesStatus } from '@prisma/client';
import { BizError } from '../../../../src/common/http/biz-error';
import { IssuanceBatchesService } from '../../../../src/modules/issuance/issuance-batches/issuance-batches.service';

function createIssuanceBatchesPrismaMock() {
  const series: Array<{
    id: string;
    seriesNo: string;
    name: string;
    description: string;
    status: SeriesStatus;
    createdBy: null;
    updatedBy: null;
    createdAt: Date;
    updatedAt: Date;
  }> = [
    {
      id: 'ser_1',
      seriesNo: 'SER-20260514-AAAA',
      name: '星辉远征',
      description: '星际探索主题系列',
      status: SeriesStatus.ENABLED,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date('2026-05-14T09:00:00.000Z'),
      updatedAt: new Date('2026-05-14T09:30:00.000Z'),
    },
  ];

  const batches = [
    {
      id: 'bat_1',
      batchNo: 'BAT-20260514-AAAA',
      seriesId: 'ser_1',
      name: '星辉远征首发',
      quantity: 50,
      activateValidFrom: new Date('2026-05-14T00:00:00.000Z'),
      activateValidTo: new Date('2026-06-14T00:00:00.000Z'),
      status: IssuanceBatchStatus.ENABLED,
      remark: '首发批次',
      createdBy: null,
      updatedBy: null,
      createdAt: new Date('2026-05-14T10:00:00.000Z'),
      updatedAt: new Date('2026-05-14T10:30:00.000Z'),
      series: {
        id: 'ser_1',
        name: '星辉远征',
        status: SeriesStatus.ENABLED,
      },
      _count: {
        activationCodes: 12,
      },
    },
  ];

  const prisma = {
    issuanceBatch: {
      findMany: async ({
        where,
        skip,
        take,
      }: {
        where: {
          seriesId?: string;
          status?: IssuanceBatchStatus;
          OR?: Array<{
            name?: { contains: string };
            batchNo?: { contains: string };
          }>;
        };
        skip: number;
        take: number;
      }) =>
        filterBatches(batches, where)
          .slice()
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
          .slice(skip, skip + take),
      count: async ({
        where,
      }: {
        where: {
          seriesId?: string;
          status?: IssuanceBatchStatus;
          OR?: Array<{
            name?: { contains: string };
            batchNo?: { contains: string };
          }>;
        };
      }) => filterBatches(batches, where).length,
      findUnique: async ({ where }: { where: { id?: string; batchNo?: string } }) =>
        batches.find(
          (item) =>
            (where.id ? item.id === where.id : true) &&
            (where.batchNo ? item.batchNo === where.batchNo : true),
        ) ?? null,
      create: async ({
        data,
      }: {
        data: {
          batchNo: string;
          seriesId: string;
          name: string;
          quantity: number;
          activateValidFrom: Date;
          activateValidTo: Date;
          status: IssuanceBatchStatus;
          remark: string | null;
        };
      }) => ({
        id: 'bat_2',
        batchNo: data.batchNo,
        seriesId: data.seriesId,
        name: data.name,
        quantity: data.quantity,
        activateValidFrom: data.activateValidFrom,
        activateValidTo: data.activateValidTo,
        status: data.status,
        remark: data.remark,
        createdBy: null,
        updatedBy: null,
        createdAt: new Date('2026-05-14T11:00:00.000Z'),
        updatedAt: new Date('2026-05-14T11:00:00.000Z'),
      }),
    },
    series: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        series.find((item) => item.id === where.id) ?? null,
    },
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
  };

  return { prisma, series };
}

function filterBatches(
  batches: Array<{
    id: string;
    batchNo: string;
    seriesId: string;
    name: string;
    status: IssuanceBatchStatus;
    createdAt: Date;
    series: { id: string; name: string };
    _count: { activationCodes: number };
    activateValidFrom: Date;
    activateValidTo: Date;
    quantity: number;
  }>,
  where: {
    seriesId?: string;
    status?: IssuanceBatchStatus;
    OR?: Array<{
      name?: { contains: string };
      batchNo?: { contains: string };
    }>;
  },
) {
  return batches.filter((item) => {
    if (where.seriesId && item.seriesId !== where.seriesId) {
      return false;
    }

    if (where.status && item.status !== where.status) {
      return false;
    }

    if (where.OR?.length) {
      return where.OR.some((condition) => {
        if (condition.name?.contains) {
          return item.name.includes(condition.name.contains);
        }

        if (condition.batchNo?.contains) {
          return item.batchNo.includes(condition.batchNo.contains);
        }

        return false;
      });
    }

    return true;
  });
}

test('IssuanceBatchesService.listIssuanceBatches returns paginated list with timestamp fields', async () => {
  const { prisma } = createIssuanceBatchesPrismaMock();
  const service = new IssuanceBatchesService(prisma as never);

  const result = await service.listIssuanceBatches({
    page: '1',
    pageSize: '20',
    status: IssuanceBatchStatus.ENABLED,
  });

  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.seriesName, '星辉远征');
  assert.equal(result.items[0]?.seriesStatus, 'ENABLED');
  assert.equal(
    result.items[0]?.activateValidFrom,
    new Date('2026-05-14T00:00:00.000Z').getTime(),
  );
  assert.equal(
    result.items[0]?.activateValidTo,
    new Date('2026-06-14T00:00:00.000Z').getTime(),
  );
});

test('IssuanceBatchesService.getIssuanceBatchById returns detail with seriesStatus', async () => {
  const { prisma } = createIssuanceBatchesPrismaMock();
  const service = new IssuanceBatchesService(prisma as never);

  const result = await service.getIssuanceBatchById('bat_1');

  assert.equal(result.id, 'bat_1');
  assert.equal(result.seriesName, '星辉远征');
  assert.equal(result.seriesStatus, 'ENABLED');
  assert.equal(result.generatedCount, 12);
  assert.equal(result.remark, '首发批次');
  assert.equal(result.activateValidFrom, new Date('2026-05-14T00:00:00.000Z').getTime());
});

test('IssuanceBatchesService.getIssuanceBatchById rejects missing batch', async () => {
  const { prisma } = createIssuanceBatchesPrismaMock();
  const service = new IssuanceBatchesService(prisma as never);

  await assert.rejects(
    () => service.getIssuanceBatchById('bat_missing'),
    (error: unknown) =>
      error instanceof BizError && error.code === 'ISSUANCE_BATCH_NOT_FOUND',
  );
});

test('IssuanceBatchesService.createIssuanceBatch rejects invalid time range', async () => {
  const { prisma } = createIssuanceBatchesPrismaMock();
  const service = new IssuanceBatchesService(prisma as never);

  await assert.rejects(
    () =>
      service.createIssuanceBatch({
        seriesId: 'ser_1',
        name: '批次 A',
        quantity: 10,
        activateValidFrom: '2026-06-14T00:00:00.000Z',
        activateValidTo: '2026-05-14T00:00:00.000Z',
        remark: 'time range invalid',
      }),
    (error: unknown) =>
      error instanceof BizError &&
      error.code === 'INVALID_ISSUANCE_BATCH_VALID_TIME_RANGE',
  );
});

test('IssuanceBatchesService.createIssuanceBatch validates positive quantity through zod', async () => {
  const { prisma } = createIssuanceBatchesPrismaMock();
  const service = new IssuanceBatchesService(prisma as never);

  await assert.rejects(
    () =>
      service.createIssuanceBatch({
        seriesId: 'ser_1',
        name: '批次 A',
        quantity: 0,
        activateValidFrom: '2026-05-14T00:00:00.000Z',
        activateValidTo: '2026-06-14T00:00:00.000Z',
        remark: 'invalid quantity',
      }),
    (error: unknown) =>
      error instanceof BizError && error.code === 'VALIDATION_ERROR',
  );
});

test('IssuanceBatchesService.createIssuanceBatch rejects when series is disabled', async () => {
  const { prisma, series } = createIssuanceBatchesPrismaMock();
  series[0]!.status = SeriesStatus.DISABLED;
  const service = new IssuanceBatchesService(prisma as never);

  await assert.rejects(
    () =>
      service.createIssuanceBatch({
        seriesId: 'ser_1',
        name: '批次 A',
        quantity: 10,
        activateValidFrom: '2026-05-14T00:00:00.000Z',
        activateValidTo: '2026-06-14T00:00:00.000Z',
        remark: 'series disabled',
      }),
    (error: unknown) =>
      error instanceof BizError && error.code === 'SERIES_DISABLED',
  );
});

test('IssuanceBatchesService.createIssuanceBatch rejects when series does not exist', async () => {
  const { prisma } = createIssuanceBatchesPrismaMock();
  const service = new IssuanceBatchesService(prisma as never);

  await assert.rejects(
    () =>
      service.createIssuanceBatch({
        seriesId: 'ser_missing',
        name: '批次 A',
        quantity: 10,
        activateValidFrom: '2026-05-14T00:00:00.000Z',
        activateValidTo: '2026-06-14T00:00:00.000Z',
        remark: 'unknown series',
      }),
    (error: unknown) =>
      error instanceof BizError && error.code === 'SERIES_NOT_FOUND',
  );
});
