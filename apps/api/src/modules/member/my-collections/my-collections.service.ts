import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CollectionContentReviewSource,
  CollectionContentReviewStage,
  CollectionContentReviewStatus,
  CollectionContentEditStatus,
  CollectionContentPublishStatus,
  CollectionStatus,
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
import {
  nullableTextField,
  requiredIdField,
  requiredTextField,
} from '../../../common/validation/fields';
import { parseWithSchema } from '../../../common/validation/schema';
import { z } from 'zod';
import { MemberContextService } from '../auth/member-context.service';
import { PrismaService } from '../../../platform/prisma/prisma.service';
import type {
  CollectionContentVersionView,
  GetCollectionContentParams,
  GetCollectionContentResponseData,
  GetMyCollectionResponseData,
  ListMyCollectionsQuery,
  ListMyCollectionsResponseData,
  MyCollectionContentSummary,
  MyCollectionListItem,
  SaveCollectionDraftRequest,
  SaveCollectionDraftResponseData,
  SubmitCollectionContentRequest,
  SubmitCollectionContentResponseData,
} from '@contracts/member/my-collections';

/**
 * 若内容标题包含该子串，则同步机审占位策略判定为拒绝（仅用于联调与单测；后续接入真实机审服务时可删除）。
 */
const MACHINE_REJECT_TITLE_SENTINEL = '__MACHINE_REJECT__';

/**
 * 环境变量键：为 `1` / `true` / `yes`（大小写不敏感）时，同步机审通过后不立即公开，而是进入人工复核队列（`MANUAL` + `PENDING_MANUAL`）。
 */
const CONTENT_MANUAL_GATE_AFTER_MACHINE_ENV_KEY = 'CONTENT_MANUAL_GATE_AFTER_MACHINE';

/**
 * 保存草稿请求校验 schema。
 */
const saveCollectionDraftSchema = z.object({
  title: requiredTextField('title'),
  summary: requiredTextField('summary'),
  coverImageUrl: nullableTextField(),
  contentPayload: z.record(z.string(), z.unknown()),
});

/**
 * 提交内容审核请求校验 schema。
 */
const submitCollectionContentSchema = z.object({
  versionId: requiredIdField('version'),
});

/**
 * 我的藏品服务。
 * 提供会员名下藏品列表、内容版本读取、草稿保存、提交审核及同步机审占位等能力。
 */
@Injectable()
export class MyCollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memberContextService: MemberContextService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 查询当前会员名下藏品列表。
   * 当前通过 Bearer access token 解析会员身份；历史 mock token 仅保留兼容校验。
   */
  async listMyCollections(
    authContext: {
      memberId?: string;
      authorization?: string;
    },
    query: ListMyCollectionsQuery,
  ): Promise<ListMyCollectionsResponseData> {
    const member = await this.memberContextService.getCurrentActiveMember(authContext);
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const status = this.parseCollectionStatus(query.status);

    const where: Prisma.CollectionWhereInput = {
      currentOwnerMemberId: member.id,
      ...(status ? { status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.collection.findMany({
        where,
        include: {
          series: true,
          contentVersions: {
            orderBy: { versionNo: 'desc' },
            take: 1,
            include: {
              reviewRecords: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
        orderBy: { claimedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.collection.count({ where }),
    ]);

    return buildPaginatedResult({
      items: items.map((item) => this.toMyCollectionListItem(item)),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 查询当前会员某个藏品的详情摘要。
   * 仅允许读取当前会员自己名下的藏品，与内容编辑入口保持同一归属校验。
   */
  async getMyCollectionById(
    authContext: {
      memberId?: string;
      authorization?: string;
    },
    params: GetCollectionContentParams,
  ): Promise<GetMyCollectionResponseData> {
    const member = await this.memberContextService.getCurrentActiveMember(authContext);
    const collection = await this.getOwnedCollectionWithLatestVersion(member.id, params);
    const currentVersion = collection.contentVersions[0] ?? null;

    return {
      id: collection.id,
      collectionNo: collection.collectionNo,
      status: collection.status,
      series: {
        id: collection.series.id,
        seriesNo: collection.series.seriesNo,
        name: collection.series.name,
        description: collection.series.description,
      },
      currentVersion: currentVersion
        ? this.toMyCollectionContentSummary(currentVersion)
        : null,
      claimedAt: toNullableTimestamp(collection.claimedAt),
    };
  }

  /**
   * 查询当前会员某个藏品的内容编辑入口数据。
   * 仅允许读取当前会员自己名下的藏品。
   */
  async getCollectionContent(
    authContext: {
      memberId?: string;
      authorization?: string;
    },
    params: GetCollectionContentParams,
  ): Promise<GetCollectionContentResponseData> {
    const member = await this.memberContextService.getCurrentActiveMember(authContext);
    const collection = await this.getOwnedCollectionWithLatestVersion(member.id, params);

    const currentVersion = collection.contentVersions[0];

    if (!currentVersion) {
      throw new BizError({
        code: 'RESOURCE_NOT_FOUND',
        message: 'collection content version not found',
        status: 404,
      });
    }

    return {
      collectionId: collection.id,
      currentVersion: this.toCollectionContentVersionView(currentVersion),
    };
  }

  /**
   * 保存当前会员某个藏品的内容草稿。
   * 若当前版本已审核通过，则会派生新的草稿版本；若审核中，则不允许编辑。
   */
  async saveCollectionDraft(
    authContext: {
      memberId?: string;
      authorization?: string;
    },
    params: GetCollectionContentParams,
    payload: SaveCollectionDraftRequest,
  ): Promise<SaveCollectionDraftResponseData> {
    const member = await this.memberContextService.getCurrentActiveMember(authContext);
    const collection = await this.getOwnedCollectionWithLatestVersion(member.id, params);
    const currentVersion = collection.contentVersions[0];

    if (!currentVersion) {
      throw new BizError({
        code: 'RESOURCE_NOT_FOUND',
        message: 'collection content version not found',
        status: 404,
      });
    }

    const draftPayload = this.normalizeDraftPayload(payload);

    if (currentVersion.editStatus === CollectionContentEditStatus.UNDER_REVIEW) {
      throw new BizError({
        code: 'COLLECTION_NOT_EDITABLE',
        message: 'collection content is under review',
      });
    }

    if (
      currentVersion.editStatus === CollectionContentEditStatus.DRAFT ||
      currentVersion.editStatus === CollectionContentEditStatus.REJECTED
    ) {
      const updatedVersion = await this.prisma.collectionContentVersion.update({
        where: { id: currentVersion.id },
        data: {
          title: draftPayload.title,
          summary: draftPayload.summary,
          coverImageUrl: draftPayload.coverImageUrl,
          contentPayload: draftPayload.contentPayload as Prisma.InputJsonValue,
          editStatus: CollectionContentEditStatus.DRAFT,
          publishStatus:
            currentVersion.publishStatus ?? CollectionContentPublishStatus.UNPUBLISHED,
          submittedAt: null,
        },
      });

      return this.toSaveCollectionDraftResponse(updatedVersion);
    }

    const createdVersion = await this.prisma.collectionContentVersion.create({
      data: {
        collectionId: collection.id,
        versionNo: currentVersion.versionNo + 1,
        title: draftPayload.title,
        summary: draftPayload.summary,
        coverImageUrl: draftPayload.coverImageUrl,
        contentPayload: draftPayload.contentPayload as Prisma.InputJsonValue,
        editStatus: CollectionContentEditStatus.DRAFT,
        publishStatus: CollectionContentPublishStatus.UNPUBLISHED,
        createdByMemberId: member.id,
      },
    });

    return this.toSaveCollectionDraftResponse(createdVersion);
  }

  /**
   * 提交当前会员某个藏品的内容版本进入审核。
   * 提交后版本进入审核中，并初始化一条待机审审核记录。
   */
  async submitCollectionContent(
    authContext: {
      memberId?: string;
      authorization?: string;
    },
    params: GetCollectionContentParams,
    payload: SubmitCollectionContentRequest,
  ): Promise<SubmitCollectionContentResponseData> {
    const member = await this.memberContextService.getCurrentActiveMember(authContext);
    const collection = await this.getOwnedCollectionWithLatestVersion(member.id, params);
    const versionId = parseWithSchema(submitCollectionContentSchema, payload).versionId;

    const targetVersion = await this.prisma.collectionContentVersion.findUnique({
      where: { id: versionId },
    });

    if (!targetVersion || targetVersion.collectionId !== collection.id) {
      throw new BizError({
        code: 'CONTENT_VERSION_NOT_FOUND',
        message: 'content version not found',
        status: 404,
      });
    }

    if (targetVersion.editStatus === CollectionContentEditStatus.UNDER_REVIEW) {
      throw new BizError({
        code: 'CONTENT_VERSION_ALREADY_SUBMITTED',
        message: 'content version already submitted',
      });
    }

    if (
      targetVersion.editStatus !== CollectionContentEditStatus.DRAFT &&
      targetVersion.editStatus !== CollectionContentEditStatus.REJECTED
    ) {
      throw new BizError({
        code: 'CONTENT_VERSION_ALREADY_SUBMITTED',
        message: 'content version already submitted',
      });
    }

    const submittedAt = new Date();
    const { finalVersion, reviewStatus } = await this.prisma.$transaction(async (tx) => {
      const updatedVersion = await tx.collectionContentVersion.update({
        where: { id: targetVersion.id },
        data: {
          editStatus: CollectionContentEditStatus.UNDER_REVIEW,
          submittedAt,
        },
      });

      const reviewRecord = await tx.collectionContentReviewRecord.create({
        data: {
          collectionId: collection.id,
          contentVersionId: targetVersion.id,
          reviewStage: CollectionContentReviewStage.MACHINE,
          reviewStatus: CollectionContentReviewStatus.PENDING_MACHINE,
          reviewSource: CollectionContentReviewSource.SYSTEM,
        },
      });

      const machineOutcome = await this.applySynchronizedMachineReview(tx, {
        reviewRecordId: reviewRecord.id,
        contentVersionId: updatedVersion.id,
        manualGateAfterMachine: this.isContentManualGateAfterMachineEnabled(),
      });

      return {
        finalVersion: machineOutcome.version,
        reviewStatus: machineOutcome.reviewStatus,
      };
    });

    return this.toSubmitCollectionContentResponse(
      finalVersion,
      toTimestamp(submittedAt),
      reviewStatus,
    );
  }

  /**
   * 在提交事务内执行同步机审占位逻辑：默认自动通过并公开；命中拒绝子串则机审拒绝并退回可编辑态。
   * 当开启 `CONTENT_MANUAL_GATE_AFTER_MACHINE` 时，机审通过仅表示策略通过，版本保持审核中且不公开，审核记录进入待人工状态。
   */
  private async applySynchronizedMachineReview(
    tx: Prisma.TransactionClient,
    args: {
      reviewRecordId: string;
      contentVersionId: string;
      /** 机审通过后是否必须经人工复核才可公开。 */
      manualGateAfterMachine: boolean;
    },
  ): Promise<{
    version: Prisma.CollectionContentVersionGetPayload<Record<string, never>>;
    reviewStatus: CollectionContentReviewStatus;
  }> {
    const version = await tx.collectionContentVersion.findUnique({
      where: { id: args.contentVersionId },
    });

    if (!version) {
      throw new BizError({
        code: 'RESOURCE_NOT_FOUND',
        message: 'content version not found',
        status: 404,
      });
    }

    const reviewedAt = new Date();
    const reject = version.title.includes(MACHINE_REJECT_TITLE_SENTINEL);

    if (reject) {
      await tx.collectionContentReviewRecord.update({
        where: { id: args.reviewRecordId },
        data: {
          reviewStatus: CollectionContentReviewStatus.MACHINE_REJECTED,
          reviewedAt,
          reviewReason: 'machine policy rejected',
        },
      });

      const rejected = await tx.collectionContentVersion.update({
        where: { id: args.contentVersionId },
        data: {
          editStatus: CollectionContentEditStatus.REJECTED,
          publishStatus: CollectionContentPublishStatus.UNPUBLISHED,
        },
      });

      return { version: rejected, reviewStatus: CollectionContentReviewStatus.MACHINE_REJECTED };
    }

    if (args.manualGateAfterMachine) {
      await tx.collectionContentReviewRecord.update({
        where: { id: args.reviewRecordId },
        data: {
          reviewStage: CollectionContentReviewStage.MANUAL,
          reviewStatus: CollectionContentReviewStatus.PENDING_MANUAL,
          reviewedAt: null,
          reviewReason: '同步机审策略已通过，待人工复核',
        },
      });

      const pendingManual = await tx.collectionContentVersion.update({
        where: { id: args.contentVersionId },
        data: {
          editStatus: CollectionContentEditStatus.UNDER_REVIEW,
          publishStatus: CollectionContentPublishStatus.UNPUBLISHED,
          publishedAt: null,
        },
      });

      return {
        version: pendingManual,
        reviewStatus: CollectionContentReviewStatus.PENDING_MANUAL,
      };
    }

    await tx.collectionContentReviewRecord.update({
      where: { id: args.reviewRecordId },
      data: {
        reviewStatus: CollectionContentReviewStatus.MACHINE_APPROVED,
        reviewedAt,
      },
    });

    const approved = await tx.collectionContentVersion.update({
      where: { id: args.contentVersionId },
      data: {
        editStatus: CollectionContentEditStatus.APPROVED,
        publishStatus: CollectionContentPublishStatus.PUBLISHED,
        publishedAt: reviewedAt,
      },
    });

    return { version: approved, reviewStatus: CollectionContentReviewStatus.MACHINE_APPROVED };
  }

  /**
   * 是否启用「机审通过后进入人工队列」；未配置或非法值时视为关闭，保持一期 M2 机审即发布行为。
   */
  private isContentManualGateAfterMachineEnabled(): boolean {
    const raw = this.configService.get<string | undefined>(
      CONTENT_MANUAL_GATE_AFTER_MACHINE_ENV_KEY,
    );
    const asString = typeof raw === 'string' ? raw : String(raw ?? '');
    if (asString.trim() === '') {
      return false;
    }
    const normalized = asString.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }

  /**
   * 将查询结果转换为列表项视图。
   */
  private toMyCollectionListItem(
    collection: Prisma.CollectionGetPayload<{
      include: {
        series: true;
        contentVersions: {
          include: { reviewRecords: true };
        };
      };
    }>,
  ): MyCollectionListItem {
    const currentVersion = collection.contentVersions[0];
    const latestReview = currentVersion?.reviewRecords[0];

    return {
      id: collection.id,
      collectionNo: collection.collectionNo,
      status: collection.status,
      seriesNo: collection.series.seriesNo,
      seriesName: collection.series.name,
      currentVersionId: currentVersion?.id ?? null,
      currentVersionNo: currentVersion?.versionNo ?? null,
      currentVersionTitle: currentVersion?.title ?? null,
      coverImageUrl: currentVersion?.coverImageUrl ?? null,
      contentEditStatus: currentVersion?.editStatus ?? 'DRAFT',
      contentPublishStatus: currentVersion?.publishStatus ?? 'UNPUBLISHED',
      contentReviewStatus: latestReview?.reviewStatus ?? null,
      contentSubmittedAt: toNullableTimestamp(currentVersion?.submittedAt ?? null),
      contentPublishedAt: toNullableTimestamp(currentVersion?.publishedAt ?? null),
      claimedAt: toNullableTimestamp(collection.claimedAt),
    };
  }

  /**
   * 转换为当前内容版本视图。
   */
  private toCollectionContentVersionView(
    currentVersion: Prisma.CollectionContentVersionGetPayload<{
      include: { reviewRecords: true };
    }>,
  ): CollectionContentVersionView {
    const latestReview = currentVersion.reviewRecords[0];

    return {
      id: currentVersion.id,
      versionNo: currentVersion.versionNo,
      title: currentVersion.title,
      summary: currentVersion.summary,
      coverImageUrl: currentVersion.coverImageUrl ?? null,
      contentPayload: currentVersion.contentPayload as Record<string, unknown>,
      editStatus: currentVersion.editStatus,
      publishStatus: currentVersion.publishStatus,
      contentReviewStatus: latestReview?.reviewStatus ?? null,
      contentReviewReason: latestReview?.reviewReason ?? null,
      submittedAt: toNullableTimestamp(currentVersion.submittedAt),
      publishedAt: toNullableTimestamp(currentVersion.publishedAt),
      updatedAt: toTimestamp(currentVersion.updatedAt),
    };
  }

  /**
   * 转换为会员藏品详情中的最新内容摘要。
   */
  private toMyCollectionContentSummary(
    currentVersion: Prisma.CollectionContentVersionGetPayload<{
      include: { reviewRecords: true };
    }>,
  ): MyCollectionContentSummary {
    const latestReview = currentVersion.reviewRecords[0];

    return {
      id: currentVersion.id,
      versionNo: currentVersion.versionNo,
      title: currentVersion.title,
      summary: currentVersion.summary,
      coverImageUrl: currentVersion.coverImageUrl ?? null,
      editStatus: currentVersion.editStatus,
      publishStatus: currentVersion.publishStatus,
      contentReviewStatus: latestReview?.reviewStatus ?? null,
      contentReviewReason: latestReview?.reviewReason ?? null,
      submittedAt: toNullableTimestamp(currentVersion.submittedAt),
      publishedAt: toNullableTimestamp(currentVersion.publishedAt),
      updatedAt: toTimestamp(currentVersion.updatedAt),
    };
  }

  /**
   * 转换为草稿保存返回结构。
   */
  private toSaveCollectionDraftResponse(
    currentVersion: Prisma.CollectionContentVersionGetPayload<Record<string, never>>,
  ): SaveCollectionDraftResponseData {
    return {
      versionId: currentVersion.id,
      versionNo: currentVersion.versionNo,
      editStatus: currentVersion.editStatus,
      publishStatus: currentVersion.publishStatus,
      updatedAt: toTimestamp(currentVersion.updatedAt),
    };
  }

  /**
   * 转换为审核提交通知返回结构。
   */
  private toSubmitCollectionContentResponse(
    currentVersion: Prisma.CollectionContentVersionGetPayload<Record<string, never>>,
    fallbackSubmittedAt: number,
    reviewStatus: CollectionContentReviewStatus,
  ): SubmitCollectionContentResponseData {
    return {
      versionId: currentVersion.id,
      editStatus: currentVersion.editStatus,
      reviewStatus,
      submittedAt: toNullableTimestamp(currentVersion.submittedAt) ?? fallbackSubmittedAt,
    };
  }

  /**
   * 查询当前会员名下的藏品及最新内容版本。
   */
  private async getOwnedCollectionWithLatestVersion(
    memberId: string,
    params: GetCollectionContentParams,
  ) {
    const collectionId = params.collectionId?.trim();

    if (!collectionId) {
      throw new BizError({
        code: 'RESOURCE_NOT_FOUND',
        message: 'collection not found',
        status: 404,
      });
    }

    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        series: true,
        contentVersions: {
          orderBy: { versionNo: 'desc' },
          take: 1,
          include: {
            reviewRecords: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!collection) {
      throw new BizError({
        code: 'RESOURCE_NOT_FOUND',
        message: 'collection not found',
        status: 404,
      });
    }

    if (collection.currentOwnerMemberId !== memberId) {
      throw new BizError({
        code: 'COLLECTION_NOT_OWNED_BY_MEMBER',
        message: 'collection not owned by member',
        status: 403,
      });
    }

    return collection;
  }

  /**
   * 规范化草稿提交内容。
   */
  private normalizeDraftPayload(payload: SaveCollectionDraftRequest) {
    const parsedPayload = parseWithSchema(saveCollectionDraftSchema, payload);
    return {
      title: parsedPayload.title,
      summary: parsedPayload.summary,
      coverImageUrl: parsedPayload.coverImageUrl,
      contentPayload: parsedPayload.contentPayload,
    };
  }

  /**
   * 解析藏品状态筛选值。
   */
  private parseCollectionStatus(value: string | undefined): CollectionStatus | undefined {
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
