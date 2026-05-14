import { Injectable } from '@nestjs/common';
import { Prisma, SeriesStatus } from '@prisma/client';
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
import { CreateSeriesRequestDto } from './dto/create-series.request';
import { ListSeriesQueryDto } from './dto/list-series.query';
import {
  ListSeriesResponseDataDto,
  SeriesDetailDto,
  SeriesListItemDto,
  SeriesMutationResponseDataDto,
} from './dto/series.response';
import { UpdateSeriesRequestDto } from './dto/update-series.request';
import { UpdateSeriesStatusRequestDto } from './dto/update-series-status.request';

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
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查询系列列表。
   */
  async listSeries(query: ListSeriesQueryDto): Promise<ListSeriesResponseDataDto> {
    const pagination = parsePaginationQuery(query);
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
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.series.count({ where }),
    ]);

    return buildPaginatedResult({
      items: items.map((item) => this.toSeriesListItem(item)),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 查询系列详情。
   */
  async getSeriesById(seriesId: string): Promise<SeriesDetailDto> {
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

    return {
      id: series.id,
      seriesNo: series.seriesNo,
      name: series.name,
      description: series.description,
      status: series.status,
      createdAt: toTimestamp(series.createdAt),
      updatedAt: toTimestamp(series.updatedAt),
    };
  }

  /**
   * 创建系列。
   */
  async createSeries(payload: CreateSeriesRequestDto): Promise<SeriesMutationResponseDataDto> {
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

    return this.toSeriesMutationResponse(series);
  }

  /**
   * 编辑系列基础信息。
   */
  async updateSeries(
    seriesId: string,
    payload: UpdateSeriesRequestDto,
  ): Promise<SeriesMutationResponseDataDto> {
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
    payload: UpdateSeriesStatusRequestDto,
  ): Promise<SeriesMutationResponseDataDto> {
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

    return this.toSeriesMutationResponse(updatedSeries);
  }

  /**
   * 将查询结果转换为列表项视图，避免直接暴露 Prisma 实体。
   */
  private toSeriesListItem(series: Prisma.SeriesGetPayload<object>): SeriesListItemDto {
    return {
      id: series.id,
      seriesNo: series.seriesNo,
      name: series.name,
      description: series.description,
      status: series.status,
      createdAt: toTimestamp(series.createdAt),
    };
  }

  /**
   * 将写操作结果转换为统一返回结构。
   */
  private toSeriesMutationResponse(
    series: Prisma.SeriesGetPayload<object>,
  ): SeriesMutationResponseDataDto {
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
