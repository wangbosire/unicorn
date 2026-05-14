import * as assert from 'node:assert/strict';
import { test } from 'vitest';
import { SeriesStatus } from '@prisma/client';
import { BizError } from '../../../../src/common/http/biz-error';
import { SeriesService } from '../../../../src/modules/issuance/series/series.service';

function createSeriesPrismaMock() {
  const series = [
    {
      id: 'ser_1',
      seriesNo: 'SER-20260514-AAAA',
      name: '星辉远征',
      description: '星际探索主题系列',
      status: SeriesStatus.ENABLED,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date('2026-05-14T10:00:00.000Z'),
      updatedAt: new Date('2026-05-14T10:30:00.000Z'),
    },
    {
      id: 'ser_2',
      seriesNo: 'SER-20260514-BBBB',
      name: '旧城复苏',
      description: '城市文明重建主题系列',
      status: SeriesStatus.DISABLED,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date('2026-05-13T10:00:00.000Z'),
      updatedAt: new Date('2026-05-13T10:30:00.000Z'),
    },
  ];

  const prisma = {
    series: {
      findMany: async ({
        where,
        skip,
        take,
      }: {
        where: {
          status?: SeriesStatus;
          OR?: Array<{
            name?: { contains: string };
            seriesNo?: { contains: string };
          }>;
        };
        skip: number;
        take: number;
      }) =>
        filterSeries(series, where)
          .slice()
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
          .slice(skip, skip + take),
      count: async ({
        where,
      }: {
        where: {
          status?: SeriesStatus;
          OR?: Array<{
            name?: { contains: string };
            seriesNo?: { contains: string };
          }>;
        };
      }) => filterSeries(series, where).length,
      findUnique: async ({ where }: { where: { id?: string; seriesNo?: string } }) =>
        series.find(
          (item) =>
            (where.id ? item.id === where.id : true) &&
            (where.seriesNo ? item.seriesNo === where.seriesNo : true),
        ) ?? null,
      findFirst: async ({
        where,
      }: {
        where: {
          name: string;
          NOT?: { id: string };
        };
      }) =>
        series.find(
          (item) =>
            item.name === where.name &&
            (where.NOT ? item.id !== where.NOT.id : true),
        ) ?? null,
      create: async ({
        data,
      }: {
        data: {
          seriesNo: string;
          name: string;
          description: string;
          status: SeriesStatus;
        };
      }) => {
        const record = {
          id: 'ser_3',
          seriesNo: data.seriesNo,
          name: data.name,
          description: data.description,
          status: data.status,
          createdBy: null,
          updatedBy: null,
          createdAt: new Date('2026-05-14T11:00:00.000Z'),
          updatedAt: new Date('2026-05-14T11:00:00.000Z'),
        };
        series.push(record);
        return record;
      },
    },
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
  };

  return { prisma, series };
}

function filterSeries(
  series: Array<{
    id: string;
    seriesNo: string;
    name: string;
    description: string;
    status: SeriesStatus;
    createdAt: Date;
  }>,
  where: {
    status?: SeriesStatus;
    OR?: Array<{
      name?: { contains: string };
      seriesNo?: { contains: string };
    }>;
  },
) {
  return series.filter((item) => {
    if (where.status && item.status !== where.status) {
      return false;
    }

    if (where.OR?.length) {
      return where.OR.some((condition) => {
        if (condition.name?.contains) {
          return item.name.includes(condition.name.contains);
        }

        if (condition.seriesNo?.contains) {
          return item.seriesNo.includes(condition.seriesNo.contains);
        }

        return false;
      });
    }

    return true;
  });
}

test('SeriesService.listSeries returns paginated list with timestamp fields', async () => {
  const { prisma } = createSeriesPrismaMock();
  const service = new SeriesService(prisma as never);

  const result = await service.listSeries({
    page: '1',
    pageSize: '1',
    status: SeriesStatus.ENABLED,
  });

  assert.equal(result.total, 1);
  assert.equal(result.page, 1);
  assert.equal(result.pageSize, 1);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.id, 'ser_1');
  assert.equal(result.items[0]?.createdAt, new Date('2026-05-14T10:00:00.000Z').getTime());
});

test('SeriesService.listSeries rejects invalid status filter', async () => {
  const { prisma } = createSeriesPrismaMock();
  const service = new SeriesService(prisma as never);

  await assert.rejects(
    () =>
      service.listSeries({
        page: '1',
        pageSize: '20',
        status: 'INVALID',
      }),
    (error: unknown) =>
      error instanceof BizError && error.code === 'INVALID_SERIES_STATUS',
  );
});

test('SeriesService.createSeries validates required fields through zod', async () => {
  const { prisma } = createSeriesPrismaMock();
  const service = new SeriesService(prisma as never);

  await assert.rejects(
    () =>
      service.createSeries({
        name: '   ',
        description: '',
      }),
    (error: unknown) =>
      error instanceof BizError && error.code === 'VALIDATION_ERROR',
  );
});
