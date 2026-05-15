import { Injectable } from '@nestjs/common';
import {
  CollectionContentEditStatus,
  CollectionContentPublishStatus,
  CollectionContentReviewSource,
  CollectionContentReviewStage,
  CollectionContentReviewStatus,
  Prisma,
} from '@prisma/client';
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
import { PrismaService } from '../../../platform/prisma/prisma.service';
import type {
  ApproveCollectionReviewRequest,
  ApproveCollectionReviewResponseData,
  CollectionReviewHistoryItem,
  CollectionReviewListItem,
  ListCollectionReviewHistoryQuery,
  ListCollectionReviewHistoryResponseData,
  ListCollectionReviewsQuery,
  ListCollectionReviewsResponseData,
  RejectCollectionReviewRequest,
  RejectCollectionReviewResponseData,
  TakedownPublishedContentVersionRequest,
  TakedownPublishedContentVersionResponseData,
} from '@contracts/admin/collection-reviews';

/**
 * 藏品内容审核服务。
 * 当前先提供审核队列查询能力，支撑后台查看会员提交后的待处理内容。
 */
@Injectable()
export class CollectionReviewsService {
  /** 单藏品审核轨迹单次返回上限，防止一次性拉取过多行。 */
  private static readonly REVIEW_HISTORY_MAX = 200;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 按藏品编号（及可选内容版本）查询审核轨迹，按记录创建时间升序。
   */
  async listCollectionReviewHistory(
    query: ListCollectionReviewHistoryQuery,
  ): Promise<ListCollectionReviewHistoryResponseData> {
    const collectionNo = query.collectionNo?.trim();
    if (!collectionNo) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'collectionNo is required',
      });
    }

    const versionId = query.contentVersionId?.trim();

    const collection = await this.prisma.collection.findFirst({
      where: { collectionNo },
      select: { id: true },
    });

    if (!collection) {
      throw new BizError({
        code: 'COLLECTION_NOT_FOUND',
        message: 'collection not found',
        status: 404,
      });
    }

    if (versionId) {
      const version = await this.prisma.collectionContentVersion.findFirst({
        where: { id: versionId, collectionId: collection.id },
        select: { id: true },
      });
      if (!version) {
        throw new BizError({
          code: 'CONTENT_VERSION_NOT_FOUND',
          message: 'content version not found for this collection',
          status: 404,
        });
      }
    }

    const where: Prisma.CollectionContentReviewRecordWhereInput = {
      collectionId: collection.id,
      ...(versionId ? { contentVersionId: versionId } : {}),
    };

    const rows = await this.prisma.collectionContentReviewRecord.findMany({
      where,
      include: {
        collection: true,
        contentVersion: true,
        reviewedByAdminUser: { select: { displayName: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: CollectionReviewsService.REVIEW_HISTORY_MAX + 1,
    });

    if (rows.length > CollectionReviewsService.REVIEW_HISTORY_MAX) {
      throw new BizError({
        code: 'REVIEW_HISTORY_LIMIT_EXCEEDED',
        message: `review history exceeds ${CollectionReviewsService.REVIEW_HISTORY_MAX} records; refine filters`,
        status: 400,
      });
    }

    return {
      items: rows.map((row) => this.toCollectionReviewHistoryItem(row)),
    };
  }

  /**
   * 查询藏品内容审核列表。
   */
  async listCollectionReviews(
    query: ListCollectionReviewsQuery,
  ): Promise<ListCollectionReviewsResponseData> {
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const reviewStatus = this.parseReviewStatus(query.reviewStatus);
    const collectionNo = query.collectionNo?.trim();

    const collectionWhere: Prisma.CollectionWhereInput = {};
    const seriesId = query.seriesId?.trim();
    const batchId = query.batchId?.trim();
    if (seriesId) {
      collectionWhere.seriesId = seriesId;
    }
    if (batchId) {
      collectionWhere.batchId = batchId;
    }
    if (collectionNo) {
      collectionWhere.collectionNo = collectionNo;
    }

    const where: Prisma.CollectionContentReviewRecordWhereInput = {
      ...(reviewStatus ? { reviewStatus } : {}),
      ...(Object.keys(collectionWhere).length > 0 ? { collection: collectionWhere } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.collectionContentReviewRecord.findMany({
        where,
        include: {
          collection: true,
          contentVersion: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.collectionContentReviewRecord.count({ where }),
    ]);

    return buildPaginatedResult({
      items: items.map((item) => this.toCollectionReviewListItem(item)),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 人工通过藏品内容审核。
   * 当前仅允许处理待人工审核记录，并同步更新内容版本的编辑与发布状态。
   */
  async approveCollectionReview(
    reviewId: string,
    payload: ApproveCollectionReviewRequest,
  ): Promise<ApproveCollectionReviewResponseData> {
    const normalizedReviewId = reviewId?.trim();
    const reviewComment = payload.comment?.trim() ?? null;

    if (!normalizedReviewId) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'review id is required',
      });
    }

    const reviewRecord = await this.prisma.collectionContentReviewRecord.findUnique({
      where: { id: normalizedReviewId },
      include: {
        contentVersion: true,
      },
    });

    if (!reviewRecord) {
      throw new BizError({
        code: 'REVIEW_RECORD_NOT_FOUND',
        message: 'review record not found',
        status: 404,
      });
    }

    if (
      reviewRecord.reviewStage !== CollectionContentReviewStage.MANUAL ||
      reviewRecord.reviewStatus !== CollectionContentReviewStatus.PENDING_MANUAL
    ) {
      throw new BizError({
        code: 'REVIEW_STATUS_INVALID',
        message: 'review status invalid',
      });
    }

    const reviewedAt = new Date();
    const approvedReviewRecord = await this.prisma.$transaction(async (tx) => {
      const updatedReviewRecord = await tx.collectionContentReviewRecord.update({
        where: { id: reviewRecord.id },
        data: {
          reviewStatus: CollectionContentReviewStatus.MANUAL_APPROVED,
          reviewSource: CollectionContentReviewSource.ADMIN,
          reviewReason: reviewComment,
          reviewedAt,
        },
      });

      await tx.collectionContentVersion.update({
        where: { id: reviewRecord.contentVersionId },
        data: {
          editStatus: CollectionContentEditStatus.APPROVED,
          publishStatus: CollectionContentPublishStatus.PUBLISHED,
          publishedAt: reviewedAt,
        },
      });

      return updatedReviewRecord;
    });

    return {
      reviewId: approvedReviewRecord.id,
      reviewStatus: approvedReviewRecord.reviewStatus,
      publishStatus: CollectionContentPublishStatus.PUBLISHED,
      reviewedAt: toNullableTimestamp(approvedReviewRecord.reviewedAt) ?? toTimestamp(reviewedAt),
    };
  }

  /**
   * 人工驳回藏品内容审核。
   * 仅允许处理待人工审核记录；版本退回可编辑态且不公开（与机审拒绝分支一致）。
   */
  async rejectCollectionReview(
    reviewId: string,
    payload: RejectCollectionReviewRequest,
  ): Promise<RejectCollectionReviewResponseData> {
    const normalizedReviewId = reviewId?.trim();
    const reason = payload.reason?.trim() ?? '';

    if (!normalizedReviewId) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'review id is required',
      });
    }

    if (!reason) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'reject reason is required',
      });
    }

    const reviewRecord = await this.prisma.collectionContentReviewRecord.findUnique({
      where: { id: normalizedReviewId },
      include: {
        contentVersion: true,
      },
    });

    if (!reviewRecord) {
      throw new BizError({
        code: 'REVIEW_RECORD_NOT_FOUND',
        message: 'review record not found',
        status: 404,
      });
    }

    if (
      reviewRecord.reviewStage !== CollectionContentReviewStage.MANUAL ||
      reviewRecord.reviewStatus !== CollectionContentReviewStatus.PENDING_MANUAL
    ) {
      throw new BizError({
        code: 'REVIEW_STATUS_INVALID',
        message: 'review status invalid',
      });
    }

    const reviewedAt = new Date();
    const rejectedReviewRecord = await this.prisma.$transaction(async (tx) => {
      const updatedReviewRecord = await tx.collectionContentReviewRecord.update({
        where: { id: reviewRecord.id },
        data: {
          reviewStatus: CollectionContentReviewStatus.MANUAL_REJECTED,
          reviewSource: CollectionContentReviewSource.ADMIN,
          reviewReason: reason,
          reviewedAt,
        },
      });

      await tx.collectionContentVersion.update({
        where: { id: reviewRecord.contentVersionId },
        data: {
          editStatus: CollectionContentEditStatus.REJECTED,
          publishStatus: CollectionContentPublishStatus.UNPUBLISHED,
          publishedAt: null,
        },
      });

      return updatedReviewRecord;
    });

    return {
      reviewId: rejectedReviewRecord.id,
      reviewStatus: rejectedReviewRecord.reviewStatus,
      publishStatus: CollectionContentPublishStatus.UNPUBLISHED,
      reviewedAt: toNullableTimestamp(rejectedReviewRecord.reviewedAt) ?? toTimestamp(reviewedAt),
    };
  }

  /**
   * 运营下架：将已通过审核且当前为公开发布态（`PUBLISHED`）的内容版本标记为 `TAKEDOWN`。
   * 公开展示读在「最高已审核版本为下架态」时将返回 410，与从未公开区分。
   * 请求体中的 `reason` 一期仅占位，后续可接入审计/运营台账。
   */
  async takedownPublishedContentVersion(
    contentVersionId: string,
    _payload: TakedownPublishedContentVersionRequest,
  ): Promise<TakedownPublishedContentVersionResponseData> {
    const id = contentVersionId?.trim();
    if (!id) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'contentVersionId is required',
      });
    }

    const version = await this.prisma.collectionContentVersion.findUnique({
      where: { id },
      include: {
        collection: { select: { collectionNo: true } },
      },
    });

    if (!version) {
      throw new BizError({
        code: 'CONTENT_VERSION_NOT_FOUND',
        message: 'content version not found',
        status: 404,
      });
    }

    if (version.editStatus !== CollectionContentEditStatus.APPROVED) {
      throw new BizError({
        code: 'TAKEDOWN_STATUS_INVALID',
        message: 'only approved content versions can be taken down',
        status: 400,
      });
    }

    if (version.publishStatus === CollectionContentPublishStatus.TAKEDOWN) {
      throw new BizError({
        code: 'TAKEDOWN_STATUS_INVALID',
        message: 'content version is already taken down',
        status: 400,
      });
    }

    if (version.publishStatus !== CollectionContentPublishStatus.PUBLISHED) {
      throw new BizError({
        code: 'TAKEDOWN_STATUS_INVALID',
        message: 'only published content versions can be taken down',
        status: 400,
      });
    }

    const appliedAt = new Date();
    await this.prisma.collectionContentVersion.update({
      where: { id },
      data: {
        publishStatus: CollectionContentPublishStatus.TAKEDOWN,
      },
    });

    return {
      contentVersionId: id,
      collectionNo: version.collection.collectionNo,
      publishStatus: 'TAKEDOWN',
      appliedAt: toTimestamp(appliedAt),
    };
  }

  /**
   * 转换为审核历史时间线项。
   */
  private toCollectionReviewHistoryItem(
    reviewRecord: Prisma.CollectionContentReviewRecordGetPayload<{
      include: {
        collection: true;
        contentVersion: true;
        reviewedByAdminUser: { select: { displayName: true } };
      };
    }>,
  ): CollectionReviewHistoryItem {
    return {
      reviewId: reviewRecord.id,
      collectionNo: reviewRecord.collection.collectionNo,
      contentVersionId: reviewRecord.contentVersionId,
      versionNo: reviewRecord.contentVersion.versionNo,
      reviewStage: reviewRecord.reviewStage,
      reviewStatus: reviewRecord.reviewStatus,
      reviewSource: reviewRecord.reviewSource,
      reviewReason: reviewRecord.reviewReason ?? null,
      createdAt: toTimestamp(reviewRecord.createdAt),
      reviewedAt: toNullableTimestamp(reviewRecord.reviewedAt),
      reviewedByDisplayName:
        reviewRecord.reviewedByAdminUser?.displayName?.trim() || null,
    };
  }

  /**
   * 转换为审核列表项视图。
   */
  private toCollectionReviewListItem(
    reviewRecord: Prisma.CollectionContentReviewRecordGetPayload<{
      include: {
        collection: true;
        contentVersion: true;
      };
    }>,
  ): CollectionReviewListItem {
    return {
      reviewId: reviewRecord.id,
      collectionId: reviewRecord.collectionId,
      collectionNo: reviewRecord.collection.collectionNo,
      contentVersionId: reviewRecord.contentVersionId,
      versionNo: reviewRecord.contentVersion.versionNo,
      reviewStage: reviewRecord.reviewStage,
      reviewStatus: reviewRecord.reviewStatus,
      reviewReason: reviewRecord.reviewReason ?? null,
      submittedAt:
        toNullableTimestamp(reviewRecord.contentVersion.submittedAt) ??
        toTimestamp(reviewRecord.createdAt),
    };
  }

  /**
   * 解析审核状态筛选值。
   */
  private parseReviewStatus(
    value: string | undefined,
  ): CollectionContentReviewStatus | undefined {
    return parseOptionalEnumValue(
      value,
      [
        CollectionContentReviewStatus.PENDING_MACHINE,
        CollectionContentReviewStatus.MACHINE_APPROVED,
        CollectionContentReviewStatus.MACHINE_REJECTED,
        CollectionContentReviewStatus.PENDING_MANUAL,
        CollectionContentReviewStatus.MANUAL_APPROVED,
        CollectionContentReviewStatus.MANUAL_REJECTED,
      ],
      'INVALID_COLLECTION_REVIEW_STATUS',
      'invalid collection review status',
    );
  }
}
