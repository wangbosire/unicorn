import { Injectable, Logger } from '@nestjs/common';
import {
  CollectionCommentStatus,
  CollectionContentEditStatus,
  CollectionContentPublishStatus,
  Prisma,
} from '@prisma/client';
import type {
  CreateCollectionCommentRequest,
  CreateCollectionCommentResponseData,
  ReplyCollectionCommentParams,
  ReplyCollectionCommentRequest,
  ReplyCollectionCommentResponseData,
} from '@contracts/member/collection-comments';
import { z } from 'zod';
import { BizError } from '../../../common/http/biz-error';
import { toNullableTimestamp, toTimestamp } from '../../../common/serializers/timestamp';
import {
  requiredIdField,
  requiredTextField,
} from '../../../common/validation/fields';
import { parseWithSchema } from '../../../common/validation/schema';
import { PrismaService } from '../../../platform/prisma/prisma.service';
import { MemberContextService } from '../auth/member-context.service';

const createCollectionCommentSchema = z.object({
  collectionNo: requiredTextField('collectionNo'),
  content: requiredTextField('content'),
});

const replyCollectionCommentParamsSchema = z.object({
  commentId: requiredIdField('comment'),
});

const replyCollectionCommentBodySchema = z.object({
  content: requiredTextField('content'),
});

/**
 * 若评论正文包含该子串，则同步占位机审判定为拒绝，仅用于当前联调与测试。
 */
const COMMENT_MACHINE_REJECT_SENTINEL = '__MACHINE_REJECT__';

/**
 * 若评论正文包含该子串，则同步占位机审判定进入人工审核，仅用于当前联调与测试。
 */
const COMMENT_MANUAL_REVIEW_SENTINEL = '__MANUAL_REVIEW__';

/**
 * 会员评论服务。
 * 提供评论写入主链路，并在提交时执行同步占位机审：
 * - 默认机审通过后直接公开
 * - 命中人工标记后进入待人工审核
 * - 命中拒绝标记后直接驳回
 */
@Injectable()
export class CollectionCommentsService {
  private readonly logger = new Logger(CollectionCommentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly memberContextService: MemberContextService,
  ) {}

  /**
   * 在指定公开藏品下发表评论。
   * 一期仅允许对当前存在已公开内容快照的藏品发表评论。
   */
  async createCollectionComment(
    authContext: {
      memberId?: string;
      authorization?: string;
    },
    payload: CreateCollectionCommentRequest,
  ): Promise<CreateCollectionCommentResponseData> {
    const member = await this.memberContextService.getCurrentActiveMember(authContext);
    const input = parseWithSchema(createCollectionCommentSchema, payload);
    const publishedTarget = await this.getPublishedCommentTargetByCollectionNo(
      input.collectionNo,
    );

    const createdComment = await this.prisma.$transaction(async (tx) => {
      const comment = await tx.collectionComment.create({
        data: {
          collectionId: publishedTarget.collectionId,
          contentVersionId: publishedTarget.contentVersionId,
          memberId: member.id,
          content: input.content,
          status: CollectionCommentStatus.PENDING_MACHINE,
          publishedAt: null,
        },
      });

      const machineOutcome = this.resolveMachineReviewOutcome(comment.content);
      const reviewedAt = new Date();

      await tx.collectionCommentReviewRecord.create({
        data: {
          commentId: comment.id,
          reviewStatus: machineOutcome.reviewStatus,
          reviewSource: 'SYSTEM',
          reviewedAt,
          reviewReason: machineOutcome.reviewReason,
        },
      });

      const updatedComment = await tx.collectionComment.update({
        where: { id: comment.id },
        data: {
          status: machineOutcome.reviewStatus,
          publishedAt: machineOutcome.shouldPublish ? reviewedAt : null,
        },
      });

      return {
        comment: updatedComment,
        reviewReason: machineOutcome.reviewReason,
      };
    });

    this.logger.log('comment submitted', {
      event: 'comment.submitted',
      actor: member.id,
      commentId: createdComment.comment.id,
      collectionId: createdComment.comment.collectionId,
      contentVersionId: createdComment.comment.contentVersionId,
      machineOutcome: createdComment.comment.status,
    });

    return {
      commentId: createdComment.comment.id,
      collectionId: createdComment.comment.collectionId,
      collectionNo: input.collectionNo.trim(),
      contentVersionId: createdComment.comment.contentVersionId,
      status: createdComment.comment.status,
      reviewReason: createdComment.reviewReason,
      publishedAt: toNullableTimestamp(createdComment.comment.publishedAt),
      createdAt: toTimestamp(createdComment.comment.createdAt),
    };
  }

  /**
   * 对一级评论发表评论回复。
   * 一期仅支持两层结构，因此不允许继续对回复再回复。
   */
  async replyCollectionComment(
    authContext: {
      memberId?: string;
      authorization?: string;
    },
    params: ReplyCollectionCommentParams,
    payload: ReplyCollectionCommentRequest,
  ): Promise<ReplyCollectionCommentResponseData> {
    const member = await this.memberContextService.getCurrentActiveMember(authContext);
    const parsedParams = parseWithSchema(replyCollectionCommentParamsSchema, params);
    const parsedPayload = parseWithSchema(replyCollectionCommentBodySchema, payload);

    const parentComment = await this.prisma.collectionComment.findUnique({
      where: { id: parsedParams.commentId },
      include: {
        collection: true,
        contentVersion: true,
      },
    });

    if (!parentComment) {
      this.logger.warn('reply rejected: parent not found', {
        event: 'comment.reply.rejected',
        code: 'COMMENT_NOT_FOUND',
        actor: member.id,
        parentCommentId: parsedParams.commentId,
      });
      throw new BizError({
        code: 'COMMENT_NOT_FOUND',
        message: 'comment not found',
        status: 404,
      });
    }

    if (parentComment.parentCommentId) {
      this.logger.warn('reply rejected: depth exceeded', {
        event: 'comment.reply.rejected',
        code: 'COMMENT_REPLY_DEPTH_EXCEEDED',
        parentCommentId: parentComment.id,
      });
      throw new BizError({
        code: 'COMMENT_REPLY_DEPTH_EXCEEDED',
        message: 'only root comments can be replied to',
      });
    }

    if (
      parentComment.status !== CollectionCommentStatus.MANUAL_APPROVED &&
      parentComment.status !== CollectionCommentStatus.MACHINE_APPROVED
    ) {
      this.logger.warn('reply rejected: parent not replyable', {
        event: 'comment.reply.rejected',
        code: 'COMMENT_NOT_REPLYABLE',
        parentCommentId: parentComment.id,
        parentStatus: parentComment.status,
      });
      throw new BizError({
        code: 'COMMENT_NOT_REPLYABLE',
        message: 'comment is not replyable',
      });
    }

    this.ensurePublishedContentVersion(parentComment.contentVersion);

    const createdReply = await this.prisma.$transaction(async (tx) => {
      const reply = await tx.collectionComment.create({
        data: {
          collectionId: parentComment.collectionId,
          contentVersionId: parentComment.contentVersionId,
          memberId: member.id,
          parentCommentId: parentComment.id,
          rootCommentId: parentComment.id,
          content: parsedPayload.content,
          status: CollectionCommentStatus.PENDING_MACHINE,
          publishedAt: null,
        },
      });

      const machineOutcome = this.resolveMachineReviewOutcome(reply.content);
      const reviewedAt = new Date();

      await tx.collectionCommentReviewRecord.create({
        data: {
          commentId: reply.id,
          reviewStatus: machineOutcome.reviewStatus,
          reviewSource: 'SYSTEM',
          reviewedAt,
          reviewReason: machineOutcome.reviewReason,
        },
      });

      const updatedReply = await tx.collectionComment.update({
        where: { id: reply.id },
        data: {
          status: machineOutcome.reviewStatus,
          publishedAt: machineOutcome.shouldPublish ? reviewedAt : null,
        },
      });

      return {
        comment: updatedReply,
        reviewReason: machineOutcome.reviewReason,
      };
    });

    this.logger.log('comment reply submitted', {
      event: 'comment.reply.submitted',
      actor: member.id,
      commentId: createdReply.comment.id,
      parentCommentId: parentComment.id,
      machineOutcome: createdReply.comment.status,
    });

    return {
      commentId: createdReply.comment.id,
      collectionId: createdReply.comment.collectionId,
      collectionNo: parentComment.collection.collectionNo,
      contentVersionId: createdReply.comment.contentVersionId,
      parentCommentId: parentComment.id,
      rootCommentId: parentComment.id,
      status: createdReply.comment.status,
      reviewReason: createdReply.reviewReason,
      publishedAt: toNullableTimestamp(createdReply.comment.publishedAt),
      createdAt: toTimestamp(createdReply.comment.createdAt),
    };
  }

  /**
   * 根据藏品编号定位当前可评论的已公开内容版本。
   */
  private async getPublishedCommentTargetByCollectionNo(collectionNo: string): Promise<{
    collectionId: string;
    contentVersionId: string;
  }> {
    const collection = await this.prisma.collection.findUnique({
      where: { collectionNo: collectionNo.trim() },
      include: {
        contentVersions: {
          where: { editStatus: CollectionContentEditStatus.APPROVED },
          orderBy: { versionNo: 'desc' },
          take: 50,
        },
      },
    });

    if (!collection) {
      throw new BizError({
        code: 'PUBLIC_COLLECTION_NOT_FOUND',
        message: 'public collection not found',
        status: 404,
      });
    }

    const publishedVersion = collection.contentVersions.find(
      (version) =>
        version.publishStatus === CollectionContentPublishStatus.PUBLISHED &&
        version.publishedAt != null,
    );

    if (!publishedVersion) {
      throw new BizError({
        code: 'PUBLIC_COLLECTION_NOT_FOUND',
        message: 'public collection not found',
        status: 404,
      });
    }

    return {
      collectionId: collection.id,
      contentVersionId: publishedVersion.id,
    };
  }

  /**
   * 校验评论回复依赖的内容版本仍处于公开态。
   */
  private ensurePublishedContentVersion(
    version: Prisma.CollectionContentVersionGetPayload<Record<string, never>>,
  ) {
    if (
      version.editStatus !== CollectionContentEditStatus.APPROVED ||
      version.publishStatus !== CollectionContentPublishStatus.PUBLISHED ||
      version.publishedAt == null
    ) {
      throw new BizError({
        code: 'COMMENT_NOT_REPLYABLE',
        message: 'comment is not replyable',
      });
    }
  }

  /**
   * 同步占位机审策略。
   * 当前通过正文中的标记串模拟三类结果，便于在无外部审核服务时先打通真实状态流。
   */
  private resolveMachineReviewOutcome(content: string): {
    reviewStatus: CollectionCommentStatus;
    shouldPublish: boolean;
    reviewReason: string | null;
  } {
    if (content.includes(COMMENT_MACHINE_REJECT_SENTINEL)) {
      return {
        reviewStatus: CollectionCommentStatus.MACHINE_REJECTED,
        shouldPublish: false,
        reviewReason: 'machine review rejected by sentinel',
      };
    }

    if (content.includes(COMMENT_MANUAL_REVIEW_SENTINEL)) {
      return {
        reviewStatus: CollectionCommentStatus.PENDING_MANUAL,
        shouldPublish: false,
        reviewReason: 'machine review escalated to manual review by sentinel',
      };
    }

    return {
      reviewStatus: CollectionCommentStatus.MACHINE_APPROVED,
      shouldPublish: true,
      reviewReason: null,
    };
  }
}
