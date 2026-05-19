import { Injectable, Logger } from '@nestjs/common';
import { IssuanceBatchStatus, Prisma, SeriesStatus } from '@prisma/client';
import type {
  CreateSeriesRequest,
  ListSeriesQuery,
  ListSeriesResponseData,
  SeriesDetail,
  SeriesListItem,
  SeriesMutationResponseData,
  UpdateSeriesRequest,
  UpdateSeriesStatusRequest,
} from '@contracts/admin/series';
import { BizError } from '../../../common/http/biz-error';
import { generatePrefixedCode } from '../../../common/identity/code-generator';
import {
  buildPaginatedResult,
  parsePaginationQuery,
} from '../../../common/pagination/pagination';
import { toTimestamp } from '../../../common/serializers/timestamp';
import { parseOptionalEnumValue } from '../../../common/validation/enum';
import {
  optionalTextField,
  requiredTextField,
} from '../../../common/validation/fields';
import { parseWithSchema } from '../../../common/validation/schema';
import { PrismaService } from '../../../platform/prisma/prisma.service';
import { z } from 'zod';

const createSeriesSchema = z.object({
  name: requiredTextField('series name'),
  description: requiredTextField('series description'),
});

const updateSeriesSchema = z
  .object({
    name: optionalTextField('series name'),
    description: optionalTextField('series description'),
  })
  .refine((value) => value.name !== undefined || value.description !== undefined, {
    message: 'at least one field is required',
  });

const updateSeriesStatusSchema = z.object({
  status: z.enum([SeriesStatus.ENABLED, SeriesStatus.DISABLED], {
    error: 'invalid series status',
  }),
});

/**
 * 系列管理服务。
 * 当前先承载后台系列管理的最小可用能力，后续同类 issuance 模块可沿用相同模式扩展。
 */
@Injectable()
export class SeriesService {
  private readonly logger = new Logger(SeriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查询系列列表。
   */
  async listSeries(query: ListSeriesQuery): Promise<ListSeriesResponseData> {
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const keyword = query.keyword?.trim();
    const status = this.parseSeriesStatus(query.status);

    const where: Prisma.SeriesWhereInput = {
      ...(status ? { status } : {}),
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword } },
              { seriesNo: { contains: keyword } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.series.findMany({
        where,
        include: {
          _count: {
            select: {
              batches: true,
              collections: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.series.count({ where }),
    ]);

    const enabledBatchCounts = await this.listEnabledBatchCountsBySeriesIds(
      items.map((item) => item.id),
    );

    return buildPaginatedResult({
      items: items.map((item) =>
        this.toSeriesListItem(item, enabledBatchCounts.get(item.id) ?? 0),
      ),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 查询系列详情。
   */
  async getSeriesById(seriesId: string): Promise<SeriesDetail> {
    const series = await this.prisma.series.findUnique({
      where: { id: seriesId },
      include: {
        _count: {
          select: {
            batches: true,
            collections: true,
          },
        },
      },
    });

    if (!series) {
      throw new BizError({
        code: 'SERIES_NOT_FOUND',
        message: 'series not found',
        status: 404,
      });
    }

    const enabledBatchCount = await this.prisma.issuanceBatch.count({
      where: {
        seriesId: series.id,
        status: IssuanceBatchStatus.ENABLED,
      },
    });

    return {
      id: series.id,
      seriesNo: series.seriesNo,
      name: series.name,
      description: series.description,
      status: series.status,
      batchCount: series._count.batches,
      enabledBatchCount,
      collectionCount: series._count.collections,
      createdAt: toTimestamp(series.createdAt),
      updatedAt: toTimestamp(series.updatedAt),
    };
  }

  /**
   * 创建系列。
   */
  async createSeries(payload: CreateSeriesRequest): Promise<SeriesMutationResponseData> {
    const parsedPayload = parseWithSchema(createSeriesSchema, payload);
    const { name, description } = parsedPayload;

    const existingSeries = await this.prisma.series.findFirst({
      where: { name },
      select: { id: true },
    });

    if (existingSeries) {
      throw new BizError({
        code: 'SERIES_NAME_DUPLICATED',
        message: 'series name duplicated',
      });
    }

    const series = await this.prisma.series.create({
      data: {
        seriesNo: await this.generateSeriesNo(),
        name,
        description,
        status: SeriesStatus.ENABLED,
      },
    });

    this.logger.log('series created', {
      event: 'issuance.series.created',
      seriesId: series.id,
      seriesNo: series.seriesNo,
    });

    return this.toSeriesMutationResponse(series);
  }

  /**
   * 编辑系列基础信息。
   */
  async updateSeries(
    seriesId: string,
    payload: UpdateSeriesRequest,
  ): Promise<SeriesMutationResponseData> {
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

    const parsedPayload = parseWithSchema(updateSeriesSchema, payload);
    const name = parsedPayload.name;
    const description = parsedPayload.description;

    if (name && name !== series.name) {
      const duplicate = await this.prisma.series.findFirst({
        where: {
          name,
          NOT: { id: seriesId },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new BizError({
          code: 'SERIES_NAME_DUPLICATED',
          message: 'series name duplicated',
        });
      }
    }

    const updatedSeries = await this.prisma.series.update({
      where: { id: seriesId },
      data: {
        ...(name ? { name } : {}),
        ...(description ? { description } : {}),
      },
    });

    return this.toSeriesMutationResponse(updatedSeries);
  }

  /**
   * 更新系列状态。
   */
  async updateSeriesStatus(
    seriesId: string,
    payload: UpdateSeriesStatusRequest,
  ): Promise<SeriesMutationResponseData> {
    const status = parseWithSchema(updateSeriesStatusSchema, payload).status;

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

    const updatedSeries = await this.prisma.series.update({
      where: { id: seriesId },
      data: { status },
    });

    this.logger.log('series status changed', {
      event: 'issuance.series.status.changed',
      seriesId: updatedSeries.id,
      seriesNo: updatedSeries.seriesNo,
      fromStatus: series.status,
      toStatus: updatedSeries.status,
    });

    return this.toSeriesMutationResponse(updatedSeries);
  }

  /**
   * 将查询结果转换为列表项视图，避免直接暴露 Prisma 实体。
   */
  private toSeriesListItem(
    series: Prisma.SeriesGetPayload<{
      include: {
        _count: {
          select: {
            batches: true;
            collections: true;
          };
        };
      };
    }>,
    enabledBatchCount: number,
  ): SeriesListItem {
    return {
      id: series.id,
      seriesNo: series.seriesNo,
      name: series.name,
      description: series.description,
      status: series.status,
      batchCount: series._count.batches,
      enabledBatchCount,
      collectionCount: series._count.collections,
      createdAt: toTimestamp(series.createdAt),
    };
  }

  /**
   * 批量查询系列下启用中的发行批次数，避免列表接口逐条统计。
   */
  private async listEnabledBatchCountsBySeriesIds(
    seriesIds: string[],
  ): Promise<Map<string, number>> {
    if (seriesIds.length === 0) {
      return new Map();
    }

    const grouped = await this.prisma.issuanceBatch.groupBy({
      by: ['seriesId'],
      where: {
        seriesId: { in: seriesIds },
        status: IssuanceBatchStatus.ENABLED,
      },
      _count: {
        _all: true,
      },
    });

    return new Map(
      grouped.map((item) => [item.seriesId, item._count._all]),
    );
  }

  /**
   * 将写操作结果转换为统一返回结构。
   */
  private toSeriesMutationResponse(
    series: Prisma.SeriesGetPayload<object>,
  ): SeriesMutationResponseData {
    return {
      id: series.id,
      seriesNo: series.seriesNo,
      name: series.name,
      description: series.description,
      status: series.status,
    };
  }

  /**
   * 解析系列状态筛选值。
   */
  private parseSeriesStatus(value: string | undefined): SeriesStatus | undefined {
    return parseOptionalEnumValue(
      value,
      [SeriesStatus.ENABLED, SeriesStatus.DISABLED],
      'INVALID_SERIES_STATUS',
      'invalid series status',
    );
  }

  /**
   * 生成对外可读的系列编号。
   * 当前采用日期前缀加随机片段，后续如有统一编号服务可替换。
   */
  private async generateSeriesNo(): Promise<string> {
    return generatePrefixedCode(
      {
        prefix: 'SER',
        randomLength: 4,
        maxAttempts: 5,
        errorCode: 'SERIES_NO_GENERATION_FAILED',
        errorMessage: 'failed to generate unique series number',
      },
      async (candidate) => {
        const existingSeries = await this.prisma.series.findUnique({
          where: { seriesNo: candidate },
          select: { id: true },
        });

        return !existingSeries;
      },
    );
  }
}
