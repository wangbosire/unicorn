import { Injectable, Logger } from '@nestjs/common';
import {
  ActivationCodeStatus,
  CollectionStatus,
  IssuanceBatchStatus,
  Prisma,
  SeriesStatus,
} from '@prisma/client';
import { BizError } from '../../../common/http/biz-error';
import {
  generatePrefixedCode,
  generateSegmentedCode,
} from '../../../common/identity/code-generator';
import {
  buildPaginatedResult,
  parsePaginationQuery,
} from '../../../common/pagination/pagination';
import { toNullableTimestamp } from '../../../common/serializers/timestamp';
import { parseOptionalEnumValue } from '../../../common/validation/enum';
import {
  positiveIntegerField,
  requiredIdField,
  requiredTextField,
} from '../../../common/validation/fields';
import { parseWithSchema } from '../../../common/validation/schema';
import { PrismaService } from '../../../platform/prisma/prisma.service';
import { z } from 'zod';
import type {
  ActivationCodeDetail,
  ActivationCodeListItem,
  GenerateActivationCodesRequest,
  GenerateActivationCodesResponseData,
  GeneratedActivationCode,
  ListActivationCodesQuery,
  ListActivationCodesResponseData,
  VoidActivationCodeResponseData,
} from '@contracts/admin/activation-codes';

const generateActivationCodesSchema = z.object({
  batchId: requiredIdField('issuance batch'),
  count: positiveIntegerField('generate count'),
  issuedChannel: requiredTextField('issued channel'),
});

/**
 * 激活码管理服务。
 * 当前聚焦 M1 所需的查询与批量生成能力，并在生成时同步创建待领取藏品。
 */
@Injectable()
export class ActivationCodesService {
  private readonly logger = new Logger(ActivationCodesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查询激活码列表。
   */
  async listActivationCodes(
    query: ListActivationCodesQuery,
  ): Promise<ListActivationCodesResponseData> {
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const keyword = query.keyword?.trim();
    const status = this.parseActivationCodeStatus(query.status);

    const where: Prisma.ActivationCodeWhereInput = {
      ...(query.batchId ? { batchId: query.batchId } : {}),
      ...(status ? { status } : {}),
      ...(keyword
        ? {
            OR: [
              { code: { contains: keyword } },
              { collection: { collectionNo: { contains: keyword } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.activationCode.findMany({
        where,
        include: {
          batch: true,
          collection: true,
          usedByMember: {
            select: {
              memberNo: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.activationCode.count({ where }),
    ]);

    return buildPaginatedResult({
      items: items.map((item) => this.toActivationCodeListItem(item)),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 查询单个激活码详情，供后台查看发放、使用与作废轨迹。
   */
  async getActivationCodeById(
    activationCodeId: string,
  ): Promise<ActivationCodeDetail> {
    const id = activationCodeId?.trim();
    if (!id) {
      throw new BizError({
        code: 'ACTIVATION_CODE_ID_REQUIRED',
        message: 'activation code id is required',
        status: 400,
      });
    }

    const activationCode = await this.prisma.activationCode.findUnique({
      where: { id },
      include: {
        batch: true,
        collection: true,
        usedByMember: {
          select: {
            id: true,
            memberNo: true,
          },
        },
      },
    });

    if (!activationCode) {
      throw new BizError({
        code: 'ACTIVATION_CODE_NOT_FOUND',
        message: 'activation code not found',
        status: 404,
      });
    }

    return {
      id: activationCode.id,
      code: activationCode.code,
      batchId: activationCode.batchId,
      batchNo: activationCode.batch.batchNo,
      batchName: activationCode.batch.name,
      collectionId: activationCode.collectionId,
      collectionNo: activationCode.collection.collectionNo,
      status: activationCode.status,
      issuedChannel: activationCode.issuedChannel,
      issuedAt: toNullableTimestamp(activationCode.issuedAt),
      usedByMemberId: activationCode.usedByMember?.id ?? null,
      usedByMemberNo: activationCode.usedByMember?.memberNo ?? null,
      usedAt: toNullableTimestamp(activationCode.usedAt),
      expiredAt: toNullableTimestamp(activationCode.expiredAt),
      voidedAt: toNullableTimestamp(activationCode.voidedAt),
      createdAt: activationCode.createdAt.getTime(),
      updatedAt: activationCode.updatedAt.getTime(),
    };
  }

  /**
   * 批量生成激活码。
   * 该操作会在一个事务中同步创建待领取藏品和激活码，确保一一对应关系成立。
   */
  async generateActivationCodes(
    payload: GenerateActivationCodesRequest,
  ): Promise<GenerateActivationCodesResponseData> {
    const parsedPayload = parseWithSchema(generateActivationCodesSchema, payload);
    const batch = await this.ensureBatchCanGenerate(parsedPayload.batchId);
    const count = parsedPayload.count;
    const issuedChannel = parsedPayload.issuedChannel;

    const generatedItems = await this.prisma.$transaction(async (tx) => {
      const existingCount = await tx.activationCode.count({
        where: { batchId: batch.id },
      });

      if (existingCount + count > batch.quantity) {
        throw new BizError({
          code: 'ACTIVATION_CODE_GENERATION_EXCEEDS_BATCH_QUANTITY',
          message: 'activation code generation exceeds batch quantity',
        });
      }

      const items: GeneratedActivationCode[] = [];

      for (let index = 0; index < count; index += 1) {
        const collectionNo = await this.generateCollectionNo(tx);
        const code = await this.generateActivationCodeValue(tx);

        const collection = await tx.collection.create({
          data: {
            collectionNo,
            seriesId: batch.seriesId,
            batchId: batch.id,
            status: CollectionStatus.PENDING_CLAIM,
          },
        });

        const activationCode = await tx.activationCode.create({
          data: {
            code,
            batchId: batch.id,
            collectionId: collection.id,
            status: ActivationCodeStatus.UNISSUED,
            issuedChannel,
            expiredAt: batch.activateValidTo,
          },
        });

        items.push({
          id: activationCode.id,
          code: activationCode.code,
          collectionId: collection.id,
          collectionNo: collection.collectionNo,
          status: activationCode.status,
        });
      }

      return items;
    });

    this.logger.log('activation codes generated', {
      event: 'issuance.activation_code.generated',
      batchId: batch.id,
      generatedCount: generatedItems.length,
    });

    return {
      batchId: batch.id,
      generatedCount: generatedItems.length,
      activationCodes: generatedItems,
    };
  }

  /**
   * 将未使用激活码作废，用于运营回收误发或未发放码；已使用或已过期码不允许作废。
   */
  async voidActivationCode(
    activationCodeId: string,
  ): Promise<VoidActivationCodeResponseData> {
    const id = activationCodeId?.trim();
    if (!id) {
      throw new BizError({
        code: 'ACTIVATION_CODE_ID_REQUIRED',
        message: 'activation code id is required',
        status: 400,
      });
    }

    const activationCode = await this.prisma.activationCode.findUnique({
      where: { id },
    });

    if (!activationCode) {
      throw new BizError({
        code: 'ACTIVATION_CODE_NOT_FOUND',
        message: 'activation code not found',
        status: 404,
      });
    }

    if (activationCode.status === ActivationCodeStatus.USED) {
      throw new BizError({
        code: 'ACTIVATION_CODE_CANNOT_VOID_USED',
        message: 'activation code already used',
        status: 400,
      });
    }

    if (activationCode.status === ActivationCodeStatus.VOIDED) {
      throw new BizError({
        code: 'ACTIVATION_CODE_ALREADY_VOIDED',
        message: 'activation code already voided',
        status: 400,
      });
    }

    if (activationCode.status === ActivationCodeStatus.EXPIRED) {
      throw new BizError({
        code: 'ACTIVATION_CODE_CANNOT_VOID_EXPIRED',
        message: 'activation code already expired',
        status: 400,
      });
    }

    if (
      activationCode.status !== ActivationCodeStatus.UNISSUED &&
      activationCode.status !== ActivationCodeStatus.ISSUED
    ) {
      throw new BizError({
        code: 'ACTIVATION_CODE_CANNOT_VOID',
        message: 'activation code cannot be voided in current status',
        status: 400,
      });
    }

    const now = new Date();
    const updated = await this.prisma.activationCode.update({
      where: { id },
      data: {
        status: ActivationCodeStatus.VOIDED,
        voidedAt: now,
      },
    });

    this.logger.log('activation code voided', {
      event: 'issuance.activation_code.voided',
      activationCodeId: updated.id,
      fromStatus: activationCode.status,
      toStatus: ActivationCodeStatus.VOIDED,
    });

    return {
      id: updated.id,
      code: updated.code,
      status: updated.status,
    };
  }

  /**
   * 将查询结果转换为列表项视图，避免直接暴露 Prisma 实体。
   */
  private toActivationCodeListItem(
    activationCode: Prisma.ActivationCodeGetPayload<{
      include: {
        batch: true;
        collection: true;
        usedByMember: {
          select: {
            memberNo: true;
          };
        };
      };
    }>,
  ): ActivationCodeListItem {
    return {
      id: activationCode.id,
      code: activationCode.code,
      batchId: activationCode.batchId,
      batchName: activationCode.batch.name,
      collectionId: activationCode.collectionId,
      collectionNo: activationCode.collection.collectionNo,
      status: activationCode.status,
      issuedChannel: activationCode.issuedChannel,
      usedByMemberNo: activationCode.usedByMember?.memberNo ?? null,
      usedAt: toNullableTimestamp(activationCode.usedAt),
      expiredAt: toNullableTimestamp(activationCode.expiredAt),
    };
  }

  /**
   * 校验批次是否存在且仍允许生成激活码。
   */
  private async ensureBatchCanGenerate(batchId: string) {
    if (!batchId) {
      throw new BizError({
        code: 'ISSUANCE_BATCH_ID_REQUIRED',
        message: 'issuance batch id is required',
      });
    }

    const batch = await this.prisma.issuanceBatch.findUnique({
      where: { id: batchId },
      include: {
        series: {
          select: { id: true, status: true },
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

    if (batch.status !== IssuanceBatchStatus.ENABLED) {
      throw new BizError({
        code: 'ISSUANCE_BATCH_DISABLED',
        message: 'issuance batch is disabled',
      });
    }

    if (batch.series.status !== SeriesStatus.ENABLED) {
      throw new BizError({
        code: 'SERIES_DISABLED',
        message: 'series is disabled',
      });
    }

    return batch;
  }

  /**
   * 解析激活码状态筛选值。
   */
  private parseActivationCodeStatus(
    value: string | undefined,
  ): ActivationCodeStatus | undefined {
    return parseOptionalEnumValue(
      value,
      [
        ActivationCodeStatus.UNISSUED,
        ActivationCodeStatus.ISSUED,
        ActivationCodeStatus.USED,
        ActivationCodeStatus.VOIDED,
        ActivationCodeStatus.EXPIRED,
      ],
      'INVALID_ACTIVATION_CODE_STATUS',
      'invalid activation code status',
    );
  }

  /**
   * 生成对外展示的藏品编号。
   * 当前采用日期前缀加随机片段，后续可替换为统一编号服务。
   */
  private async generateCollectionNo(tx: Prisma.TransactionClient): Promise<string> {
    return generatePrefixedCode(
      {
        prefix: 'COL',
        randomLength: 5,
        maxAttempts: 10,
        errorCode: 'COLLECTION_NO_GENERATION_FAILED',
        errorMessage: 'failed to generate unique collection number',
      },
      async (candidate) => {
      const existingCollection = await tx.collection.findUnique({
        where: { collectionNo: candidate },
        select: { id: true },
      });

        return !existingCollection;
      },
    );
  }

  /**
   * 生成唯一激活码。
   */
  private async generateActivationCodeValue(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    return generateSegmentedCode(
      {
        segmentLength: 4,
        segmentCount: 3,
        maxAttempts: 10,
        errorCode: 'ACTIVATION_CODE_GENERATION_FAILED',
        errorMessage: 'failed to generate unique activation code',
      },
      async (candidate) => {
      const existingActivationCode = await tx.activationCode.findUnique({
        where: { code: candidate },
        select: { id: true },
      });

        return !existingActivationCode;
      },
    );
  }
}
