import { Injectable } from '@nestjs/common';
import {
  CollectionCommentStatus,
  CollectionContentEditStatus,
  CollectionContentPublishStatus,
} from '@prisma/client';
import type {
  GetPublicCollectionResponseData,
  PublicCollectionStats,
} from '@contracts/public/collections';
import { BizError } from '../../../common/http/biz-error';
import { PrismaService } from '../../../platform/prisma/prisma.service';

/**
 * 公开展示读服务。
 * 仅返回已通过审核且处于公开发布态的内容快照；若当前最高已审核版本为下架态（`TAKEDOWN`），
 * 返回 410 与独立业务码，便于与「从未公开」的 404 区分。
 */
@Injectable()
export class PublicCollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 按公开展示标识查询藏品内容。
   * 一期约定：`slug` 与 `collections.collection_no` 一致；后续若引入独立 slug 列，仅调整查询条件即可。
   */
  async getPublicCollectionBySlug(slug: string): Promise<GetPublicCollectionResponseData> {
    const normalized = slug?.trim();

    if (!normalized) {
      throw new BizError({
        code: 'RESOURCE_NOT_FOUND',
        message: 'public collection not found',
        status: 404,
      });
    }

    const collection = await this.prisma.collection.findUnique({
      where: { collectionNo: normalized },
      include: {
        series: true,
        batch: true,
        currentOwnerMember: true,
        contentVersions: {
          where: { editStatus: CollectionContentEditStatus.APPROVED },
          orderBy: { versionNo: 'desc' },
          take: 50,
        },
      },
    });

    const owner = collection?.currentOwnerMember;
    if (!collection || !owner) {
      throw new BizError({
        code: 'RESOURCE_NOT_FOUND',
        message: 'public collection not found',
        status: 404,
      });
    }

    const approvedVersions = collection.contentVersions;
    if (approvedVersions.length < 1) {
      throw new BizError({
        code: 'RESOURCE_NOT_FOUND',
        message: 'public collection not found',
        status: 404,
      });
    }

    /**
     * 以「最高版本号的已审核版本」为当前公开态锚点：
     * - 若为 `TAKEDOWN`，视为运营下架，返回 410 以便 C 端与普通「未公开」区分；
     * - 否则在仍存在 `PUBLISHED` 且带 `publishedAt` 的版本时返回公开展示快照（允许较低版本号仍处已发布态）。
     */
    const latestApproved = approvedVersions[0]!;
    if (latestApproved.publishStatus === CollectionContentPublishStatus.TAKEDOWN) {
      throw new BizError({
        code: 'PUBLIC_COLLECTION_TAKEDOWN',
        message: 'public collection is taken down',
        status: 410,
      });
    }

    const publishedVersion = approvedVersions.find(
      (version) =>
        version.publishStatus === CollectionContentPublishStatus.PUBLISHED &&
        version.publishedAt != null,
    );

    if (!publishedVersion?.publishedAt) {
      throw new BizError({
        code: 'RESOURCE_NOT_FOUND',
        message: 'public collection not found',
        status: 404,
      });
    }

    const visibleStatuses = [
      CollectionCommentStatus.MACHINE_APPROVED,
      CollectionCommentStatus.MANUAL_APPROVED,
    ];

    const visibleCommentWhere = {
      collectionId: collection.id,
      status: {
        in: visibleStatuses,
      },
    };

    const [topLevelCommentCount, totalCommentCount] = await Promise.all([
      this.prisma.collectionComment.count({
        where: {
          ...visibleCommentWhere,
          parentCommentId: null,
        },
      }),
      this.prisma.collectionComment.count({
        where: visibleCommentWhere,
      }),
    ]);

    return {
      collectionNo: collection.collectionNo,
      slug: collection.collectionNo,
      seriesId: collection.seriesId,
      seriesNo: collection.series.seriesNo,
      seriesName: collection.series.name,
      batchId: collection.batchId,
      batchNo: collection.batch.batchNo,
      batchName: collection.batch.name,
      contentVersionId: publishedVersion.id,
      versionNo: publishedVersion.versionNo,
      title: publishedVersion.title,
      summary: publishedVersion.summary,
      coverImageUrl: publishedVersion.coverImageUrl,
      contentPayload: publishedVersion.contentPayload as Record<string, unknown>,
      owner: {
        memberNo: owner.memberNo,
        nickname: owner.nickname,
        avatarUrl: owner.avatarUrl,
      },
      topLevelCommentCount,
      totalCommentCount,
      publishedAt: publishedVersion.publishedAt.toISOString(),
    };
  }

  /**
   * 返回公开展示页统计摘要。
   * 当前聚焦一期已存在模型：已审核版本数量、是否存在公开快照与最近公开时间。
   */
  async getPublicCollectionStatsBySlug(slug: string): Promise<PublicCollectionStats> {
    const normalized = slug?.trim();

    if (!normalized) {
      throw new BizError({
        code: 'RESOURCE_NOT_FOUND',
        message: 'public collection not found',
        status: 404,
      });
    }

    const collection = await this.prisma.collection.findUnique({
      where: { collectionNo: normalized },
      include: {
        currentOwnerMember: {
          select: {
            memberNo: true,
            nickname: true,
          },
        },
        contentVersions: {
          where: { editStatus: CollectionContentEditStatus.APPROVED },
          orderBy: { versionNo: 'desc' },
          take: 50,
        },
      },
    });

    if (!collection) {
      throw new BizError({
        code: 'RESOURCE_NOT_FOUND',
        message: 'public collection not found',
        status: 404,
      });
    }

    const approvedVersions = collection.contentVersions;
    const latestApproved = approvedVersions[0] ?? null;
    const publishedVersion =
      approvedVersions.find(
        (version) =>
          version.publishStatus === CollectionContentPublishStatus.PUBLISHED &&
          version.publishedAt != null,
      ) ?? null;

    const visibleStatuses = [
      CollectionCommentStatus.MACHINE_APPROVED,
      CollectionCommentStatus.MANUAL_APPROVED,
    ];

    const visibleCommentWhere = {
      collectionId: collection.id,
      status: {
        in: visibleStatuses,
      },
    };

    const [topLevelCommentCount, totalCommentCount] = await Promise.all([
      this.prisma.collectionComment.count({
        where: {
          ...visibleCommentWhere,
          parentCommentId: null,
        },
      }),
      this.prisma.collectionComment.count({
        where: visibleCommentWhere,
      }),
    ]);

    return {
      collectionNo: collection.collectionNo,
      slug: collection.collectionNo,
      ownerMemberNo: collection.currentOwnerMember?.memberNo ?? null,
      ownerNickname: collection.currentOwnerMember?.nickname ?? null,
      approvedVersionCount: approvedVersions.length,
      hasPublishedContent: publishedVersion != null,
      latestApprovedVersionNo: latestApproved?.versionNo ?? null,
      publishedVersionNo: publishedVersion?.versionNo ?? null,
      topLevelCommentCount,
      totalCommentCount,
      publishedAt: publishedVersion?.publishedAt?.toISOString() ?? null,
    };
  }
}
