import { Injectable, Logger } from '@nestjs/common';
import {
  CollectionCommentStatus,
  CollectionCommentReviewSource,
  NotificationMessageType,
  Prisma,
} from '@prisma/client';
import type {
  AdminCollectionCommentListItem,
  ApproveCollectionCommentRequest,
  ApproveCollectionCommentResponseData,
  BlockCollectionCommentRequest,
  BlockCollectionCommentResponseData,
  CollectionCommentReviewListItem,
  ListCollectionCommentReviewsQuery,
  ListCollectionCommentReviewsResponseData,
  ListCollectionCommentsQuery,
  ListCollectionCommentsResponseData,
  RejectCollectionCommentRequest,
  RejectCollectionCommentResponseData,
} from '@contracts/admin/collection-comments';
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
import { NotificationDispatcherService } from '../../notifications/notification-dispatcher.service';
import { PrismaService } from '../../../platform/prisma/prisma.service';

/// 评论摘录字数上限，用于通知文案显示。
const COMMENT_EXCERPT_MAX = 30;

function makeCommentExcerpt(content: string): string {
  const trimmed = content.replace(/\s+/g, ' ').trim();
  return trimmed.length > COMMENT_EXCERPT_MAX
    ? `${trimmed.slice(0, COMMENT_EXCERPT_MAX)}…`
    : trimmed;
}

/**
 * 后台评论治理服务。
 * 当前提供评论列表、审核队列与人工通过/驳回闭环。
 */
@Injectable()
export class CollectionCommentsService {
  private readonly logger = new Logger(CollectionCommentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationDispatcher: NotificationDispatcherService,
  ) {}

  /**
   * 查询后台评论列表。
   */
  async listCollectionComments(
    query: ListCollectionCommentsQuery,
  ): Promise<ListCollectionCommentsResponseData> {
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const status = this.parseCommentStatus(query.status);
    const collectionNo = query.collectionNo?.trim();

    const where: Prisma.CollectionCommentWhereInput = {
      ...(status ? { status } : {}),
      ...(collectionNo ? { collection: { collectionNo } } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.collectionComment.findMany({
        where,
        include: {
          collection: {
            select: {
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
          contentVersion: {
            select: {
              versionNo: true,
            },
          },
          member: { select: { id: true, memberNo: true, nickname: true } },
          replies: {
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.collectionComment.count({ where }),
    ]);

    return buildPaginatedResult({
      items: rows.map((row) => this.toAdminCollectionCommentListItem(row)),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 查询后台评论审核队列。
   * 当前以评论本体状态 + 最新审核记录摘要组合返回。
   */
  async listCollectionCommentReviews(
    query: ListCollectionCommentReviewsQuery,
  ): Promise<ListCollectionCommentReviewsResponseData> {
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const reviewStatus = this.parseCommentStatus(query.reviewStatus);
    const collectionNo = query.collectionNo?.trim();

    const where: Prisma.CollectionCommentWhereInput = {
      ...(reviewStatus ? { status: reviewStatus } : {}),
      ...(collectionNo ? { collection: { collectionNo } } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.collectionComment.findMany({
        where,
        include: {
          collection: {
            select: {
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
          contentVersion: {
            select: {
              versionNo: true,
            },
          },
          member: { select: { memberNo: true, nickname: true } },
          reviewRecords: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.collectionComment.count({ where }),
    ]);

    return buildPaginatedResult({
      items: rows.map((row) => this.toCollectionCommentReviewListItem(row)),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 人工通过评论审核。
 * 当前允许处理待人工评论，并将状态切换为人工通过。
   */
  async approveCollectionComment(
    commentId: string,
    payload: ApproveCollectionCommentRequest,
  ): Promise<ApproveCollectionCommentResponseData> {
    const id = commentId?.trim();
    if (!id) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'comment id is required',
      });
    }

    const reviewComment = payload.comment?.trim() ?? null;
    const comment = await this.prisma.collectionComment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new BizError({
        code: 'COMMENT_NOT_FOUND',
        message: 'comment not found',
        status: 404,
      });
    }

    if (comment.status !== CollectionCommentStatus.PENDING_MANUAL) {
      this.logger.warn('approve rejected: comment status invalid', {
        event: 'comment.review.approve.rejected',
        code: 'COMMENT_REVIEW_STATUS_INVALID',
        commentId: id,
        commentStatus: comment.status,
      });
      throw new BizError({
        code: 'COMMENT_REVIEW_STATUS_INVALID',
        message: 'comment review status invalid',
      });
    }

    const reviewedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.collectionComment.update({
        where: { id },
        data: {
          status: CollectionCommentStatus.MANUAL_APPROVED,
          publishedAt: reviewedAt,
        },
      });

      await tx.collectionCommentReviewRecord.create({
        data: {
          commentId: id,
          reviewStatus: CollectionCommentStatus.MANUAL_APPROVED,
          reviewSource: CollectionCommentReviewSource.ADMIN,
          reviewReason: reviewComment,
          reviewedAt,
        },
      });
    });

    this.logger.log('comment approved', {
      event: 'comment.approved',
      commentId: id,
      fromStatus: CollectionCommentStatus.PENDING_MANUAL,
      toStatus: CollectionCommentStatus.MANUAL_APPROVED,
    });

    await this.notificationDispatcher.dispatch({
      memberId: comment.memberId,
      messageType: NotificationMessageType.COMMENT_REVIEW_RESULT,
      payload: {
        excerpt: makeCommentExcerpt(comment.content),
        result: '通过',
      },
    });

    return {
      commentId: id,
      status: CollectionCommentStatus.MANUAL_APPROVED,
      reviewedAt: toTimestamp(reviewedAt),
    };
  }

  /**
   * 人工驳回评论审核。
 * 当前允许处理待人工评论，并将状态切换为人工驳回。
   */
  async rejectCollectionComment(
    commentId: string,
    payload: RejectCollectionCommentRequest,
  ): Promise<RejectCollectionCommentResponseData> {
    const id = commentId?.trim();
    if (!id) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'comment id is required',
      });
    }

    const reason = payload.reason?.trim() ?? '';
    if (!reason) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'reject reason is required',
      });
    }

    const comment = await this.prisma.collectionComment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new BizError({
        code: 'COMMENT_NOT_FOUND',
        message: 'comment not found',
        status: 404,
      });
    }

    if (comment.status !== CollectionCommentStatus.PENDING_MANUAL) {
      this.logger.warn('reject rejected: comment status invalid', {
        event: 'comment.review.reject.rejected',
        code: 'COMMENT_REVIEW_STATUS_INVALID',
        commentId: id,
        commentStatus: comment.status,
      });
      throw new BizError({
        code: 'COMMENT_REVIEW_STATUS_INVALID',
        message: 'comment review status invalid',
      });
    }

    const reviewedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.collectionComment.update({
        where: { id },
        data: {
          status: CollectionCommentStatus.MANUAL_REJECTED,
          publishedAt: null,
        },
      });

      await tx.collectionCommentReviewRecord.create({
        data: {
          commentId: id,
          reviewStatus: CollectionCommentStatus.MANUAL_REJECTED,
          reviewSource: CollectionCommentReviewSource.ADMIN,
          reviewReason: reason,
          reviewedAt,
        },
      });
    });

    this.logger.log('comment rejected', {
      event: 'comment.rejected',
      commentId: id,
      fromStatus: CollectionCommentStatus.PENDING_MANUAL,
      toStatus: CollectionCommentStatus.MANUAL_REJECTED,
    });

    await this.notificationDispatcher.dispatch({
      memberId: comment.memberId,
      messageType: NotificationMessageType.COMMENT_REVIEW_RESULT,
      payload: {
        excerpt: makeCommentExcerpt(comment.content),
        result: `驳回（${reason}）`,
      },
    });

    return {
      commentId: id,
      status: CollectionCommentStatus.MANUAL_REJECTED,
      reviewedAt: toTimestamp(reviewedAt),
    };
  }

  /**
   * 屏蔽已进入公开或已通过审核的评论。
   * 当前允许对机审通过、人工通过或已屏蔽评论执行治理；重复屏蔽保持幂等。
   */
  async blockCollectionComment(
    commentId: string,
    payload: BlockCollectionCommentRequest,
  ): Promise<BlockCollectionCommentResponseData> {
    const id = commentId?.trim();
    if (!id) {
      throw new BizError({
        code: 'VALIDATION_ERROR',
        message: 'comment id is required',
      });
    }

    const reason = payload.reason?.trim() ?? null;
    const comment = await this.prisma.collectionComment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new BizError({
        code: 'COMMENT_NOT_FOUND',
        message: 'comment not found',
        status: 404,
      });
    }

    if (
      comment.status !== CollectionCommentStatus.MACHINE_APPROVED &&
      comment.status !== CollectionCommentStatus.MANUAL_APPROVED &&
      comment.status !== CollectionCommentStatus.BLOCKED
    ) {
      this.logger.warn('block rejected: comment status invalid', {
        event: 'comment.block.rejected',
        code: 'COMMENT_BLOCK_STATUS_INVALID',
        commentId: id,
        commentStatus: comment.status,
      });
      throw new BizError({
        code: 'COMMENT_BLOCK_STATUS_INVALID',
        message: 'comment block status invalid',
      });
    }

    const reviewedAt = new Date();

    if (comment.status === CollectionCommentStatus.BLOCKED) {
      return {
        commentId: id,
        status: CollectionCommentStatus.BLOCKED,
        reviewedAt: toTimestamp(reviewedAt),
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.collectionComment.update({
        where: { id },
        data: {
          status: CollectionCommentStatus.BLOCKED,
          publishedAt: null,
        },
      });

      await tx.collectionCommentReviewRecord.create({
        data: {
          commentId: id,
          reviewStatus: CollectionCommentStatus.BLOCKED,
          reviewSource: CollectionCommentReviewSource.ADMIN,
          reviewReason: reason,
          reviewedAt,
        },
      });
    });

    this.logger.log('comment blocked', {
      event: 'comment.blocked',
      commentId: id,
      fromStatus: comment.status,
      toStatus: CollectionCommentStatus.BLOCKED,
    });

    await this.notificationDispatcher.dispatch({
      memberId: comment.memberId,
      messageType: NotificationMessageType.COMMENT_REVIEW_RESULT,
      payload: {
        excerpt: makeCommentExcerpt(comment.content),
        result: reason ? `屏蔽（${reason}）` : '屏蔽',
      },
    });

    return {
      commentId: id,
      status: CollectionCommentStatus.BLOCKED,
      reviewedAt: toTimestamp(reviewedAt),
    };
  }

  private toAdminCollectionCommentListItem(
    row: Prisma.CollectionCommentGetPayload<{
      include: {
        collection: {
          select: {
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
        contentVersion: { select: { versionNo: true } };
        member: { select: { id: true; memberNo: true; nickname: true } };
        replies: { select: { id: true } };
      };
    }>,
  ): AdminCollectionCommentListItem {
    return {
      commentId: row.id,
      collectionNo: row.collection.collectionNo,
      seriesNo: row.collection.series.seriesNo,
      seriesName: row.collection.series.name,
      batchNo: row.collection.batch.batchNo,
      batchName: row.collection.batch.name,
      contentVersionId: row.contentVersionId,
      contentVersionNo: row.contentVersion.versionNo,
      memberId: row.member.id,
      memberNo: row.member.memberNo,
      memberNickname: row.member.nickname,
      parentCommentId: row.parentCommentId,
      rootCommentId: row.rootCommentId,
      isRootComment: row.parentCommentId == null,
      replyCount: row.replies.length,
      content: row.content,
      status: row.status,
      publishedAt: toNullableTimestamp(row.publishedAt),
      createdAt: toTimestamp(row.createdAt),
    };
  }

  private toCollectionCommentReviewListItem(
    row: Prisma.CollectionCommentGetPayload<{
      include: {
        collection: {
          select: {
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
        contentVersion: { select: { versionNo: true } };
        member: { select: { memberNo: true; nickname: true } };
        reviewRecords: true;
      };
    }>,
  ): CollectionCommentReviewListItem {
    const latestReview = row.reviewRecords[0] ?? null;

    return {
      commentId: row.id,
      collectionNo: row.collection.collectionNo,
      seriesNo: row.collection.series.seriesNo,
      seriesName: row.collection.series.name,
      batchNo: row.collection.batch.batchNo,
      batchName: row.collection.batch.name,
      contentVersionId: row.contentVersionId,
      contentVersionNo: row.contentVersion.versionNo,
      memberNo: row.member.memberNo,
      memberNickname: row.member.nickname,
      parentCommentId: row.parentCommentId,
      rootCommentId: row.rootCommentId,
      isRootComment: row.parentCommentId == null,
      content: row.content,
      status: row.status,
      reviewSource: latestReview?.reviewSource ?? null,
      reviewReason: latestReview?.reviewReason ?? null,
      createdAt: toTimestamp(row.createdAt),
    };
  }

  private parseCommentStatus(
    value: string | undefined,
  ): CollectionCommentStatus | undefined {
    return parseOptionalEnumValue(
      value,
      [
        CollectionCommentStatus.PENDING_MACHINE,
        CollectionCommentStatus.MACHINE_APPROVED,
        CollectionCommentStatus.MACHINE_REJECTED,
        CollectionCommentStatus.PENDING_MANUAL,
        CollectionCommentStatus.MANUAL_APPROVED,
        CollectionCommentStatus.MANUAL_REJECTED,
        CollectionCommentStatus.BLOCKED,
      ],
      'INVALID_COLLECTION_COMMENT_STATUS',
      'invalid collection comment status',
    );
  }
}
