import { Injectable, Logger } from '@nestjs/common';
import {
  CollectionContentPublishStatus,
  CollectionStatus,
  Prisma,
} from '@prisma/client';
import type {
  AdminCollectionContentVersionSummary,
  AdminCollectionDetail,
  CollectionListItem,
  ListCollectionsQuery,
  ListCollectionsResponseData,
  UpdateCollectionStatusRequest,
  UpdateCollectionStatusResponseData,
} from '@contracts/admin/collections';
import { BizError } from '../../../common/http/biz-error';
import {
  buildPaginatedResult,
  parsePaginationQuery,
} from '../../../common/pagination/pagination';
import {
  toNullableTimestamp,
  toTimestamp,
} from '../../../common/serializers/timestamp';
import { parseOptionalEnumValue } from '../../../common/validation/enum';
import { parseWithSchema } from '../../../common/validation/schema';
import { PrismaService } from '../../../platform/prisma/prisma.service';
import { z } from 'zod';

const updateCollectionStatusSchema = z.object({
  status: z.enum([CollectionStatus.OWNED, CollectionStatus.FROZEN], {
    error: 'invalid collection status',
  }),
});

/**
 * 后台藏品管理服务。
 * 提供列表、详情与冻结/恢复状态操作，供运营侧完成最小藏品治理。
 */
@Injectable()
export class CollectionsService {
  private readonly logger = new Logger(CollectionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 分页查询后台藏品列表。
   */
  async listCollections(
    query: ListCollectionsQuery,
  ): Promise<ListCollectionsResponseData> {
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const status = this.parseCollectionStatus(query.status);
    const ownerMemberId = query.ownerMemberId?.trim();
    const seriesId = query.seriesId?.trim();
    const batchId = query.batchId?.trim();
    const collectionNo = query.collectionNo?.trim();

    const where: Prisma.CollectionWhereInput = {
      ...(status ? { status } : {}),
      ...(ownerMemberId ? { currentOwnerMemberId: ownerMemberId } : {}),
      ...(seriesId ? { seriesId } : {}),
      ...(batchId ? { batchId } : {}),
      ...(collectionNo ? { collectionNo } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.collection.findMany({
        where,
        include: {
          series: { select: { name: true } },
          batch: { select: { name: true } },
          currentOwnerMember: {
            select: { memberNo: true, nickname: true },
          },
          contentVersions: {
            include: {
              reviewRecords: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
            orderBy: { versionNo: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.collection.count({ where }),
    ]);

    return buildPaginatedResult({
      items: items.map((item) => this.toCollectionListItem(item)),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 查询单个藏品详情，返回当前拥有者、最新版本与当前公开版本摘要。
   */
  async getCollectionById(collectionId: string): Promise<AdminCollectionDetail> {
    const id = collectionId?.trim();
    if (!id) {
      throw new BizError({
        code: 'COLLECTION_NOT_FOUND',
        message: 'collection not found',
        status: 404,
      });
    }

    const collection = await this.prisma.collection.findUnique({
      where: { id },
      include: {
        series: { select: { id: true, name: true } },
        batch: { select: { id: true, name: true } },
        currentOwnerMember: {
          select: { id: true, memberNo: true, nickname: true },
        },
        comments: {
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        contentVersions: {
          include: {
            reviewRecords: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { versionNo: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            reviewRecords: true,
            contentVersions: true,
            comments: true,
          },
        },
      },
    });

    if (!collection) {
      throw new BizError({
        code: 'COLLECTION_NOT_FOUND',
        message: 'collection not found',
        status: 404,
      });
    }

    const latestContentVersion = collection.contentVersions[0] ?? null;
    const publishedContentVersion =
      collection.contentVersions.find(
        (item) => item.publishStatus === CollectionContentPublishStatus.PUBLISHED,
      ) ?? null;

    return {
      id: collection.id,
      collectionNo: collection.collectionNo,
      seriesId: collection.series.id,
      seriesName: collection.series.name,
      batchId: collection.batch.id,
      batchName: collection.batch.name,
      status: collection.status,
      owner: collection.currentOwnerMember
        ? {
            memberId: collection.currentOwnerMember.id,
            memberNo: collection.currentOwnerMember.memberNo,
            nickname: collection.currentOwnerMember.nickname,
          }
        : null,
      claimedAt: toNullableTimestamp(collection.claimedAt),
      latestContentVersion: latestContentVersion
        ? this.toContentVersionSummary(latestContentVersion)
        : null,
      publishedContentVersion: publishedContentVersion
        ? this.toContentVersionSummary(publishedContentVersion)
        : null,
      contentVersionCount: collection._count.contentVersions,
      commentsCount: collection._count.comments,
      latestCommentAt: toNullableTimestamp(collection.comments[0]?.createdAt ?? null),
      reviewRecordCount: collection._count.reviewRecords,
      createdAt: toTimestamp(collection.createdAt),
      updatedAt: toTimestamp(collection.updatedAt),
    };
  }

  /**
   * 更新藏品资产状态。
   * 当前仅开放已领取藏品在 `OWNED` / `FROZEN` 之间切换，避免误操作未领取资产。
   */
  async updateCollectionStatus(
    collectionId: string,
    payload: UpdateCollectionStatusRequest,
  ): Promise<UpdateCollectionStatusResponseData> {
    const id = collectionId?.trim();
    if (!id) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'collection id is required',
      });
    }

    const status = parseWithSchema(updateCollectionStatusSchema, payload).status;
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      select: {
        id: true,
        collectionNo: true,
        status: true,
        currentOwnerMemberId: true,
      },
    });

    if (!collection) {
      throw new BizError({
        code: 'COLLECTION_NOT_FOUND',
        message: 'collection not found',
        status: 404,
      });
    }

    if (!collection.currentOwnerMemberId) {
      throw new BizError({
        code: 'COLLECTION_STATUS_INVALID',
        message: 'unclaimed collection status cannot be updated',
        status: 400,
      });
    }

    if (
      collection.status !== CollectionStatus.OWNED &&
      collection.status !== CollectionStatus.FROZEN
    ) {
      throw new BizError({
        code: 'COLLECTION_STATUS_INVALID',
        message: 'collection status cannot be updated',
        status: 400,
      });
    }

    const updated = await this.prisma.collection.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        collectionNo: true,
        status: true,
        updatedAt: true,
      },
    });

    this.logger.log('collection status changed', {
      event: 'admin.collection.status.changed',
      collectionId: updated.id,
      collectionNo: updated.collectionNo,
      fromStatus: collection.status,
      toStatus: updated.status,
    });

    return {
      id: updated.id,
      collectionNo: updated.collectionNo,
      status: updated.status,
      updatedAt: toTimestamp(updated.updatedAt),
    };
  }

  private toCollectionListItem(
    collection: Prisma.CollectionGetPayload<{
      include: {
        series: { select: { name: true } };
        batch: { select: { name: true } };
        currentOwnerMember: { select: { memberNo: true; nickname: true } };
        contentVersions: {
          include: {
            reviewRecords: true;
          };
        };
      };
    }>,
  ): CollectionListItem {
    const latestContentVersion = collection.contentVersions[0] ?? null;
    const latestReview = latestContentVersion?.reviewRecords[0] ?? null;

    return {
      id: collection.id,
      collectionNo: collection.collectionNo,
      seriesName: collection.series.name,
      batchName: collection.batch.name,
      status: collection.status,
      currentOwnerMemberId: collection.currentOwnerMemberId,
      ownerMemberNo: collection.currentOwnerMember?.memberNo ?? null,
      ownerMemberNickname: collection.currentOwnerMember?.nickname ?? null,
      latestContentPublishStatus: latestContentVersion?.publishStatus ?? null,
      latestContentReviewStatus: latestReview?.reviewStatus ?? null,
      claimedAt: collection.claimedAt?.toISOString() ?? null,
    };
  }

  private toContentVersionSummary(
    version: Prisma.CollectionContentVersionGetPayload<{
      include: { reviewRecords: true };
    }>,
  ): AdminCollectionContentVersionSummary {
    const latestReview = version.reviewRecords[0];

    return {
      id: version.id,
      versionNo: version.versionNo,
      title: version.title,
      summary: version.summary,
      coverImageUrl: version.coverImageUrl ?? null,
      editStatus: version.editStatus,
      publishStatus: version.publishStatus,
      contentReviewStatus: latestReview?.reviewStatus ?? null,
      submittedAt: toNullableTimestamp(version.submittedAt),
      publishedAt: toNullableTimestamp(version.publishedAt),
    };
  }

  private parseCollectionStatus(
    value: string | undefined,
  ): CollectionStatus | undefined {
    return parseOptionalEnumValue(
      value,
      [
        CollectionStatus.PENDING_CLAIM,
        CollectionStatus.OWNED,
        CollectionStatus.FROZEN,
      ],
      'INVALID_COLLECTION_STATUS',
      'invalid collection status',
    );
  }
}
