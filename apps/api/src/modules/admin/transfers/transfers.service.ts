import { Injectable } from '@nestjs/common';
import {
  CollectionTransferMode,
  CollectionTransferStatus,
  Prisma,
} from '@prisma/client';
import type {
  AdminTransferOrderListItem,
  ListTransferOrdersQuery,
  ListTransferOrdersResponseData,
} from '@contracts/admin/transfers';
import {
  buildPaginatedResult,
  parsePaginationQuery,
} from '../../../common/pagination/pagination';
import {
  toNullableTimestamp,
  toTimestamp,
} from '../../../common/serializers/timestamp';
import { parseOptionalEnumValue } from '../../../common/validation/enum';
import { PrismaService } from '../../../platform/prisma/prisma.service';

/**
 * 后台转让记录服务。
 * 当前提供转让单分页查询与状态/方式筛选能力。
 */
@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 分页查询后台转让记录。
   */
  async listTransferOrders(
    query: ListTransferOrdersQuery,
  ): Promise<ListTransferOrdersResponseData> {
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const collectionNo = query.collectionNo?.trim();
    const fromMemberNo = query.fromMemberNo?.trim();
    const toMemberNo = query.toMemberNo?.trim();
    const transferMode = this.parseTransferMode(query.transferMode);
    const status = this.parseTransferStatus(query.status);

    const where: Prisma.CollectionTransferOrderWhereInput = {
      ...(collectionNo ? { collection: { collectionNo } } : {}),
      ...(fromMemberNo ? { fromMember: { memberNo: fromMemberNo } } : {}),
      ...(toMemberNo ? { toMember: { memberNo: toMemberNo } } : {}),
      ...(transferMode ? { transferMode } : {}),
      ...(status ? { status } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.collectionTransferOrder.findMany({
        where,
        include: {
          collection: {
            select: {
              id: true,
              collectionNo: true,
              series: {
                select: {
                  seriesNo: true,
                  name: true,
                },
              },
              batch: {
                select: {
                  batchNo: true,
                  name: true,
                },
              },
            },
          },
          fromMember: {
            select: {
              id: true,
              memberNo: true,
              nickname: true,
            },
          },
          toMember: {
            select: {
              id: true,
              memberNo: true,
              nickname: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.collectionTransferOrder.count({ where }),
    ]);

    return buildPaginatedResult({
      items: rows.map((row) => this.toAdminTransferOrderListItem(row)),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  private parseTransferMode(
    value: string | undefined,
  ): CollectionTransferMode | undefined {
    return parseOptionalEnumValue(
      value,
      Object.values(CollectionTransferMode),
      'INVALID_COLLECTION_TRANSFER_MODE',
      'collection transfer mode is invalid',
    );
  }

  private parseTransferStatus(
    value: string | undefined,
  ): CollectionTransferStatus | undefined {
    return parseOptionalEnumValue(
      value,
      Object.values(CollectionTransferStatus),
      'INVALID_COLLECTION_TRANSFER_STATUS',
      'collection transfer status is invalid',
    );
  }

  private toAdminTransferOrderListItem(
    row: Prisma.CollectionTransferOrderGetPayload<{
      include: {
        collection: {
          select: {
            id: true;
            collectionNo: true;
            series: {
              select: {
                seriesNo: true;
                name: true;
              };
            };
            batch: {
              select: {
                batchNo: true;
                name: true;
              };
            };
          };
        };
        fromMember: {
          select: {
            id: true;
            memberNo: true;
            nickname: true;
          };
        };
        toMember: {
          select: {
            id: true;
            memberNo: true;
            nickname: true;
          };
        };
      };
    }>,
  ): AdminTransferOrderListItem {
    return {
      transferId: row.id,
      transferNo: row.transferNo,
      collectionId: row.collection.id,
      collectionNo: row.collection.collectionNo,
      seriesNo: row.collection.series.seriesNo,
      seriesName: row.collection.series.name,
      batchNo: row.collection.batch.batchNo,
      batchName: row.collection.batch.name,
      fromMemberId: row.fromMember.id,
      fromMemberNo: row.fromMember.memberNo,
      fromMemberNickname: row.fromMember.nickname,
      toMemberId: row.toMember?.id ?? null,
      toMemberNo: row.toMember?.memberNo ?? null,
      toMemberNickname: row.toMember?.nickname ?? null,
      transferMode: row.transferMode,
      transferCode: row.transferCode,
      status: row.status,
      expiredAt: toNullableTimestamp(row.expiredAt),
      completedAt: toNullableTimestamp(row.completedAt),
      createdAt: toTimestamp(row.createdAt),
    };
  }
}
