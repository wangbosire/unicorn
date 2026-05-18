import { Injectable } from '@nestjs/common';
import {
  ActivationCodeStatus,
  CollectionStatus,
  IssuanceBatchStatus,
  Prisma,
  SeriesStatus,
} from '@prisma/client';
import type {
  CreateIssuanceBatchRequest,
  IssuanceBatchDetail,
  IssuanceBatchListItem,
  IssuanceBatchMutationResponseData,
  ListIssuanceBatchesQuery,
  ListIssuanceBatchesResponseData,
  UpdateIssuanceBatchRequest,
  UpdateIssuanceBatchStatusRequest,
} from '@contracts/admin/issuance-batches';
import { BizError } from '../../../common/http/biz-error';
import { generatePrefixedCode } from '../../../common/identity/code-generator';
import {
  buildPaginatedResult,
  parsePaginationQuery,
} from '../../../common/pagination/pagination';
import { toTimestamp } from '../../../common/serializers/timestamp';
import { parseDateRange } from '../../../common/validation/date';
import { parseOptionalEnumValue } from '../../../common/validation/enum';
import {
  optionalRemarkField,
  optionalTextField,
  positiveIntegerField,
  requiredIdField,
  requiredTextField,
} from '../../../common/validation/fields';
import { parseWithSchema } from '../../../common/validation/schema';
import { PrismaService } from '../../../platform/prisma/prisma.service';
import { z } from 'zod';

const createIssuanceBatchSchema = z.object({
  seriesId: requiredIdField('series'),
  name: requiredTextField('issuance batch name'),
  quantity: positiveIntegerField('quantity'),
  activateValidFrom: requiredTextField('activate valid from'),
  activateValidTo: requiredTextField('activate valid to'),
  remark: optionalRemarkField(),
});

const updateIssuanceBatchSchema = z
  .object({
    name: optionalTextField('issuance batch name'),
    quantity: positiveIntegerField('quantity').optional(),
    activateValidFrom: optionalTextField('activate valid from'),
    activateValidTo: optionalTextField('activate valid to'),
    remark: optionalRemarkField(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.quantity !== undefined ||
      value.activateValidFrom !== undefined ||
      value.activateValidTo !== undefined ||
      value.remark !== undefined,
    {
      message: 'at least one field is required',
    },
  );

const updateIssuanceBatchStatusSchema = z.object({
  status: z.enum([IssuanceBatchStatus.ENABLED, IssuanceBatchStatus.DISABLED], {
    error: 'invalid issuance batch status',
  }),
});

type ActivationCodeStats = {
  unissuedActivationCodesCount: number;
  issuedActivationCodesCount: number;
  usedActivationCodesCount: number;
  voidedActivationCodesCount: number;
  expiredActivationCodesCount: number;
};

type CollectionStats = {
  pendingClaimCollectionsCount: number;
  claimedCollectionsCount: number;
  frozenCollectionsCount: number;
};

/**
 * 发行批次管理服务。
 * 负责后台批次的增删改查和状态切换，并收口批次级业务校验。
 */
@Injectable()
export class IssuanceBatchesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查询发行批次列表。
   */
  async listIssuanceBatches(
    query: ListIssuanceBatchesQuery,
  ): Promise<ListIssuanceBatchesResponseData> {
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const keyword = query.keyword?.trim();
    const status = this.parseIssuanceBatchStatus(query.status);

    const where: Prisma.IssuanceBatchWhereInput = {
      ...(query.seriesId ? { seriesId: query.seriesId } : {}),
      ...(status ? { status } : {}),
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword } },
              { batchNo: { contains: keyword } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.issuanceBatch.findMany({
        where,
        include: {
          series: true,
          _count: {
            select: { activationCodes: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.issuanceBatch.count({ where }),
    ]);

    const batchIds = items.map((item) => item.id);
    const [activationCodeStats, collectionStats] = await Promise.all([
      this.listActivationCodeStatsByBatchIds(batchIds),
      this.listCollectionStatsByBatchIds(batchIds),
    ]);

    return buildPaginatedResult({
      items: items.map((item) =>
        this.toIssuanceBatchListItem(
          item,
          activationCodeStats.get(item.id) ?? this.createEmptyActivationCodeStats(),
          collectionStats.get(item.id) ?? this.createEmptyCollectionStats(),
        ),
      ),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 查询发行批次详情。
   */
  async getIssuanceBatchById(batchId: string): Promise<IssuanceBatchDetail> {
    const batch = await this.prisma.issuanceBatch.findUnique({
      where: { id: batchId },
      include: {
        series: true,
        _count: {
          select: { activationCodes: true },
        },
      },
    });

    if (!batch) {
      throw new BizError({
        code: 'ISSUANCE_BATCH_NOT_FOUND',
        message: 'issuance batch not found',
        status: 404,
      });
    }

    const [activationCodeStats, collectionStats] = await Promise.all([
      this.getActivationCodeStats(batch.id),
      this.getCollectionStats(batch.id),
    ]);

    return {
      id: batch.id,
      batchNo: batch.batchNo,
      seriesId: batch.seriesId,
      seriesName: batch.series.name,
      seriesStatus: batch.series.status,
      name: batch.name,
      quantity: batch.quantity,
      generatedCount: batch._count.activationCodes,
      remainingQuantity: Math.max(batch.quantity - batch._count.activationCodes, 0),
      unissuedActivationCodesCount: activationCodeStats.unissuedActivationCodesCount,
      issuedActivationCodesCount: activationCodeStats.issuedActivationCodesCount,
      usedActivationCodesCount: activationCodeStats.usedActivationCodesCount,
      voidedActivationCodesCount: activationCodeStats.voidedActivationCodesCount,
      expiredActivationCodesCount: activationCodeStats.expiredActivationCodesCount,
      pendingClaimCollectionsCount: collectionStats.pendingClaimCollectionsCount,
      claimedCollectionsCount: collectionStats.claimedCollectionsCount,
      frozenCollectionsCount: collectionStats.frozenCollectionsCount,
      status: batch.status,
      activateValidFrom: toTimestamp(batch.activateValidFrom),
      activateValidTo: toTimestamp(batch.activateValidTo),
      remark: batch.remark,
      createdAt: toTimestamp(batch.createdAt),
      updatedAt: toTimestamp(batch.updatedAt),
    };
  }

  /**
   * 创建发行批次。
   */
  async createIssuanceBatch(
    payload: CreateIssuanceBatchRequest,
  ): Promise<IssuanceBatchMutationResponseData> {
    const parsedPayload = parseWithSchema(createIssuanceBatchSchema, payload);
    const series = await this.ensureActiveSeriesExists(parsedPayload.seriesId);
    const name = parsedPayload.name;
    const quantity = parsedPayload.quantity;
    const timeRange = this.parseTimeRange(
      parsedPayload.activateValidFrom,
      parsedPayload.activateValidTo,
    );

    const batch = await this.prisma.issuanceBatch.create({
      data: {
        batchNo: await this.generateBatchNo(),
        seriesId: series.id,
        name,
        quantity,
        activateValidFrom: timeRange.from,
        activateValidTo: timeRange.to,
        status: IssuanceBatchStatus.ENABLED,
        remark: parsedPayload.remark?.trim() || null,
      },
    });

    return this.toIssuanceBatchMutationResponse(batch);
  }

  /**
   * 编辑发行批次。
   */
  async updateIssuanceBatch(
    batchId: string,
    payload: UpdateIssuanceBatchRequest,
  ): Promise<IssuanceBatchMutationResponseData> {
    const parsedPayload = parseWithSchema(updateIssuanceBatchSchema, payload);
    const batch = await this.prisma.issuanceBatch.findUnique({
      where: { id: batchId },
      include: {
        _count: {
          select: { activationCodes: true },
        },
      },
    });

    if (!batch) {
      throw new BizError({
        code: 'ISSUANCE_BATCH_NOT_FOUND',
        message: 'issuance batch not found',
        status: 404,
      });
    }

    const name = parsedPayload.name;
    const quantity = parsedPayload.quantity;
    const generatedCount = batch._count.activationCodes;

    // 计划数量不得低于已生成激活码数，避免与「已发码」事实冲突。
    if (quantity !== undefined && quantity < generatedCount) {
      throw new BizError({
        code: 'ISSUANCE_BATCH_QUANTITY_BELOW_GENERATED',
        message: 'issuance batch quantity cannot be less than generated activation codes count',
        status: 400,
      });
    }

    let activateValidFrom: Date | undefined;
    let activateValidTo: Date | undefined;

    if (parsedPayload.activateValidFrom || parsedPayload.activateValidTo) {
      const timeRange = this.parseTimeRange(
        parsedPayload.activateValidFrom ?? batch.activateValidFrom.toISOString(),
        parsedPayload.activateValidTo ?? batch.activateValidTo.toISOString(),
      );

      activateValidFrom = timeRange.from;
      activateValidTo = timeRange.to;
    }

    if (
      !name &&
      quantity === undefined &&
      !activateValidFrom &&
      !activateValidTo &&
      parsedPayload.remark === undefined
    ) {
      throw new BizError({
        code: 'ISSUANCE_BATCH_UPDATE_EMPTY_PAYLOAD',
        message: 'at least one field is required',
      });
    }

    const updatedBatch = await this.prisma.issuanceBatch.update({
      where: { id: batchId },
      data: {
        ...(name ? { name } : {}),
        ...(quantity !== undefined ? { quantity } : {}),
        ...(activateValidFrom ? { activateValidFrom } : {}),
        ...(activateValidTo ? { activateValidTo } : {}),
        ...(parsedPayload.remark !== undefined
          ? { remark: parsedPayload.remark?.trim() || null }
          : {}),
      },
    });

    return this.toIssuanceBatchMutationResponse(updatedBatch);
  }

  /**
   * 更新发行批次状态。
   */
  async updateIssuanceBatchStatus(
    batchId: string,
    payload: UpdateIssuanceBatchStatusRequest,
  ): Promise<IssuanceBatchMutationResponseData> {
    const status = parseWithSchema(updateIssuanceBatchStatusSchema, payload).status;

    const batch = await this.prisma.issuanceBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new BizError({
        code: 'ISSUANCE_BATCH_NOT_FOUND',
        message: 'issuance batch not found',
        status: 404,
      });
    }

    const updatedBatch = await this.prisma.issuanceBatch.update({
      where: { id: batchId },
      data: { status },
    });

    return this.toIssuanceBatchMutationResponse(updatedBatch);
  }

  /**
   * 将查询结果转换为列表项视图，避免直接暴露 Prisma 实体。
   */
  private toIssuanceBatchListItem(
    batch: Prisma.IssuanceBatchGetPayload<{
      include: {
        series: true;
        _count: { select: { activationCodes: true } };
      };
    }>,
    activationCodeStats: ActivationCodeStats,
    collectionStats: CollectionStats,
  ): IssuanceBatchListItem {
    return {
      id: batch.id,
      batchNo: batch.batchNo,
      seriesId: batch.seriesId,
      seriesName: batch.series.name,
      seriesStatus: batch.series.status,
      name: batch.name,
      quantity: batch.quantity,
      generatedCount: batch._count.activationCodes,
      remainingQuantity: Math.max(batch.quantity - batch._count.activationCodes, 0),
      unissuedActivationCodesCount: activationCodeStats.unissuedActivationCodesCount,
      issuedActivationCodesCount: activationCodeStats.issuedActivationCodesCount,
      usedActivationCodesCount: activationCodeStats.usedActivationCodesCount,
      voidedActivationCodesCount: activationCodeStats.voidedActivationCodesCount,
      expiredActivationCodesCount: activationCodeStats.expiredActivationCodesCount,
      pendingClaimCollectionsCount: collectionStats.pendingClaimCollectionsCount,
      claimedCollectionsCount: collectionStats.claimedCollectionsCount,
      frozenCollectionsCount: collectionStats.frozenCollectionsCount,
      status: batch.status,
      activateValidFrom: toTimestamp(batch.activateValidFrom),
      activateValidTo: toTimestamp(batch.activateValidTo),
    };
  }

  /**
   * 聚合单个批次下各激活码状态数量。
   */
  private async getActivationCodeStats(batchId: string): Promise<ActivationCodeStats> {
    const grouped = await this.prisma.activationCode.groupBy({
      by: ['status'],
      where: { batchId },
      _count: {
        _all: true,
      },
    });

    return this.buildActivationCodeStats(grouped);
  }

  /**
   * 批量聚合多个批次下各激活码状态数量，供列表接口复用。
   */
  private async listActivationCodeStatsByBatchIds(
    batchIds: string[],
  ): Promise<Map<string, ActivationCodeStats>> {
    if (batchIds.length === 0) {
      return new Map();
    }

    const grouped = await this.prisma.activationCode.groupBy({
      by: ['batchId', 'status'],
      where: {
        batchId: { in: batchIds },
      },
      _count: {
        _all: true,
      },
    });

    const statsMap = new Map<string, ActivationCodeStats>();

    for (const item of grouped) {
      const current = statsMap.get(item.batchId) ?? this.createEmptyActivationCodeStats();
      this.applyActivationCodeCount(current, item.status, item._count._all);
      statsMap.set(item.batchId, current);
    }

    return statsMap;
  }

  /**
   * 聚合单个批次下各藏品领取状态数量。
   */
  private async getCollectionStats(batchId: string): Promise<CollectionStats> {
    const grouped = await this.prisma.collection.groupBy({
      by: ['status'],
      where: { batchId },
      _count: {
        _all: true,
      },
    });

    return this.buildCollectionStats(grouped);
  }

  /**
   * 批量聚合多个批次下各藏品状态数量，供列表接口复用。
   */
  private async listCollectionStatsByBatchIds(
    batchIds: string[],
  ): Promise<Map<string, CollectionStats>> {
    if (batchIds.length === 0) {
      return new Map();
    }

    const grouped = await this.prisma.collection.groupBy({
      by: ['batchId', 'status'],
      where: {
        batchId: { in: batchIds },
      },
      _count: {
        _all: true,
      },
    });

    const statsMap = new Map<string, CollectionStats>();

    for (const item of grouped) {
      const current = statsMap.get(item.batchId) ?? this.createEmptyCollectionStats();
      this.applyCollectionCount(current, item.status, item._count._all);
      statsMap.set(item.batchId, current);
    }

    return statsMap;
  }

  /**
   * 构造空激活码统计结构，保持缺省返回稳定。
   */
  private createEmptyActivationCodeStats(): ActivationCodeStats {
    return {
      unissuedActivationCodesCount: 0,
      issuedActivationCodesCount: 0,
      usedActivationCodesCount: 0,
      voidedActivationCodesCount: 0,
      expiredActivationCodesCount: 0,
    };
  }

  /**
   * 根据 groupBy 结果组装单批次激活码统计。
   */
  private buildActivationCodeStats(
    grouped: Array<{
      status: ActivationCodeStatus;
      _count: { _all: number };
    }>,
  ): ActivationCodeStats {
    const stats = this.createEmptyActivationCodeStats();

    for (const item of grouped) {
      this.applyActivationCodeCount(stats, item.status, item._count._all);
    }

    return stats;
  }

  /**
   * 将单个状态计数写入激活码统计对象。
   */
  private applyActivationCodeCount(
    stats: ActivationCodeStats,
    status: ActivationCodeStatus,
    count: number,
  ) {
    switch (status) {
      case ActivationCodeStatus.UNISSUED:
        stats.unissuedActivationCodesCount = count;
        break;
      case ActivationCodeStatus.ISSUED:
        stats.issuedActivationCodesCount = count;
        break;
      case ActivationCodeStatus.USED:
        stats.usedActivationCodesCount = count;
        break;
      case ActivationCodeStatus.VOIDED:
        stats.voidedActivationCodesCount = count;
        break;
      case ActivationCodeStatus.EXPIRED:
        stats.expiredActivationCodesCount = count;
        break;
    }
  }

  /**
   * 构造空藏品状态统计结构，保持缺省返回稳定。
   */
  private createEmptyCollectionStats(): CollectionStats {
    return {
      pendingClaimCollectionsCount: 0,
      claimedCollectionsCount: 0,
      frozenCollectionsCount: 0,
    };
  }

  /**
   * 根据 groupBy 结果组装单批次藏品统计。
   */
  private buildCollectionStats(
    grouped: Array<{
      status: CollectionStatus;
      _count: { _all: number };
    }>,
  ): CollectionStats {
    const stats = this.createEmptyCollectionStats();

    for (const item of grouped) {
      this.applyCollectionCount(stats, item.status, item._count._all);
    }

    return stats;
  }

  /**
   * 将单个状态计数写入藏品统计对象。
   */
  private applyCollectionCount(
    stats: CollectionStats,
    status: CollectionStatus,
    count: number,
  ) {
    switch (status) {
      case CollectionStatus.PENDING_CLAIM:
        stats.pendingClaimCollectionsCount = count;
        break;
      case CollectionStatus.OWNED:
        stats.claimedCollectionsCount = count;
        break;
      case CollectionStatus.FROZEN:
        stats.frozenCollectionsCount = count;
        break;
    }
  }

  /**
   * 将写操作结果转换为统一返回结构。
   */
  private toIssuanceBatchMutationResponse(
    batch: Prisma.IssuanceBatchGetPayload<object>,
  ): IssuanceBatchMutationResponseData {
    return {
      id: batch.id,
      batchNo: batch.batchNo,
      seriesId: batch.seriesId,
      name: batch.name,
      quantity: batch.quantity,
      status: batch.status,
    };
  }

  /**
   * 校验系列是否存在且可用于创建批次。
   */
  private async ensureActiveSeriesExists(seriesId: string) {
    if (!seriesId) {
      throw new BizError({
        code: 'SERIES_ID_REQUIRED',
        message: 'series id is required',
      });
    }

    const series = await this.prisma.series.findUnique({
      where: { id: seriesId },
    });

    if (!series) {
      throw new BizError({
        code: 'SERIES_NOT_FOUND',
        message: 'series not found',
        status: 404,
      });
    }

    if (series.status !== SeriesStatus.ENABLED) {
      throw new BizError({
        code: 'SERIES_DISABLED',
        message: 'series is disabled',
      });
    }

    return series;
  }

  /**
   * 解析批次状态筛选值。
   */
  private parseIssuanceBatchStatus(
    value: string | undefined,
  ): IssuanceBatchStatus | undefined {
    return parseOptionalEnumValue(
      value,
      [IssuanceBatchStatus.ENABLED, IssuanceBatchStatus.DISABLED],
      'INVALID_ISSUANCE_BATCH_STATUS',
      'invalid issuance batch status',
    );
  }

  /**
   * 解析并校验激活有效时间范围。
   */
  private parseTimeRange(
    activateValidFrom: string,
    activateValidTo: string,
  ): { from: Date; to: Date } {
    return parseDateRange(
      {
        from: activateValidFrom,
        to: activateValidTo,
      },
      {
        errorCode: 'INVALID_ISSUANCE_BATCH_VALID_TIME_RANGE',
        invalidMessage: 'invalid activate valid time range',
        outOfOrderMessage: 'activate valid from must be earlier than activate valid to',
      },
    );
  }

  /**
   * 生成对外可读的批次编号。
   * 当前采用日期前缀加随机片段，后续如有统一编号服务可替换。
   */
  private async generateBatchNo(): Promise<string> {
    return generatePrefixedCode(
      {
        prefix: 'BAT',
        randomLength: 4,
        maxAttempts: 5,
        errorCode: 'ISSUANCE_BATCH_NO_GENERATION_FAILED',
        errorMessage: 'failed to generate unique issuance batch number',
      },
      async (candidate) => {
        const existingBatch = await this.prisma.issuanceBatch.findUnique({
          where: { batchNo: candidate },
          select: { id: true },
        });

        return !existingBatch;
      },
    );
  }
}
