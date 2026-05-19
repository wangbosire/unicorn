import { Injectable, Logger } from '@nestjs/common';
import {
  ActivationCodeStatus,
  CollectionCommentStatus,
  CollectionContentPublishStatus,
  CollectionContentReviewStage,
  CollectionContentReviewStatus,
  CollectionStatus,
} from '@prisma/client';
import type { GetDashboardOverviewResponseData } from '@contracts/admin/dashboard';
import { toTimestamp } from '../../../common/serializers/timestamp';
import { PrismaService } from '../../../platform/prisma/prisma.service';

/**
 * 后台仪表盘统计服务。
 * 聚合当前 Prisma 模型已可真实计算的关键运营指标。
 */
@Injectable()
export class DashboardService {
  // 只读统计服务：异常由 ApiExceptionFilter 统一记日志。
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取后台首页总览统计。
   * 当前仅返回已具备真实数据模型支撑的指标，不虚构转让或通知数据。
   */
  async getDashboardOverview(): Promise<GetDashboardOverviewResponseData> {
    const generatedAt = new Date();

    const [
      activationCodesTotal,
      usedActivationCodesTotal,
      claimedCollectionsTotal,
      pendingClaimCollectionsTotal,
      frozenCollectionsTotal,
      pendingManualCollectionReviewsTotal,
      publishedContentVersionsTotal,
      pendingManualCommentsTotal,
      membersTotal,
    ] = await this.prisma.$transaction([
      this.prisma.activationCode.count(),
      this.prisma.activationCode.count({
        where: {
          status: ActivationCodeStatus.USED,
        },
      }),
      this.prisma.collection.count({
        where: {
          claimedAt: { not: null },
        },
      }),
      this.prisma.collection.count({
        where: {
          status: CollectionStatus.PENDING_CLAIM,
        },
      }),
      this.prisma.collection.count({
        where: {
          status: CollectionStatus.FROZEN,
        },
      }),
      this.prisma.collectionContentReviewRecord.count({
        where: {
          reviewStage: CollectionContentReviewStage.MANUAL,
          reviewStatus: CollectionContentReviewStatus.PENDING_MANUAL,
        },
      }),
      this.prisma.collectionContentVersion.count({
        where: {
          publishStatus: CollectionContentPublishStatus.PUBLISHED,
        },
      }),
      this.prisma.collectionComment.count({
        where: {
          status: CollectionCommentStatus.PENDING_MANUAL,
        },
      }),
      this.prisma.member.count(),
    ]);

    return {
      activationCodesTotal,
      usedActivationCodesTotal,
      claimedCollectionsTotal,
      pendingClaimCollectionsTotal,
      frozenCollectionsTotal,
      pendingManualCollectionReviewsTotal,
      publishedContentVersionsTotal,
      pendingManualCommentsTotal,
      membersTotal,
      generatedAt: toTimestamp(generatedAt),
    };
  }
}
