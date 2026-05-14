import { Injectable } from '@nestjs/common';
import {
  ActivationCodeStatus,
  CollectionStatus,
  IssuanceBatchStatus,
  Prisma,
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
import {
  ActivationCodeListItemDto,
  GenerateActivationCodesResponseDataDto,
  GeneratedActivationCodeDto,
  ListActivationCodesResponseDataDto,
} from './dto/activation-code.response';
import { GenerateActivationCodesRequestDto } from './dto/generate-activation-codes.request';
import { ListActivationCodesQueryDto } from './dto/list-activation-codes.query';

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
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查询激活码列表。
   */
  async listActivationCodes(
    query: ListActivationCodesQueryDto,
  ): Promise<ListActivationCodesResponseDataDto> {
    const pagination = parsePaginationQuery(query);
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
   * 批量生成激活码。
   * 该操作会在一个事务中同步创建待领取藏品和激活码，确保一一对应关系成立。
   */
  async generateActivationCodes(
    payload: GenerateActivationCodesRequestDto,
  ): Promise<GenerateActivationCodesResponseDataDto> {
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

      const items: GeneratedActivationCodeDto[] = [];

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

    return {
      batchId: batch.id,
      generatedCount: generatedItems.length,
      activationCodes: generatedItems,
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
      };
    }>,
  ): ActivationCodeListItemDto {
    return {
      id: activationCode.id,
      code: activationCode.code,
      batchId: activationCode.batchId,
      batchName: activationCode.batch.name,
      collectionId: activationCode.collectionId,
      collectionNo: activationCode.collection.collectionNo,
      status: activationCode.status,
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
