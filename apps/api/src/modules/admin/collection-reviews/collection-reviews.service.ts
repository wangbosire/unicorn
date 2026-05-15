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
  CollectionReviewListItem,
  ListCollectionReviewsQuery,
  ListCollectionReviewsResponseData,
  RejectCollectionReviewRequest,
  RejectCollectionReviewResponseData,
} from '@contracts/admin/collection-reviews';

/**
 * 藏品内容审核服务。
 * 当前先提供审核队列查询能力，支撑后台查看会员提交后的待处理内容。
 */
@Injectable()
export class CollectionReviewsService {
  constructor(private readonly prisma: PrismaService) {}

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
