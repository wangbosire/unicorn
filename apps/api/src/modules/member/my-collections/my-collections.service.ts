import { Injectable } from '@nestjs/common';
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
  ListMyCollectionsQuery,
  ListMyCollectionsResponseData,
  MyCollectionListItem,
  SaveCollectionDraftRequest,
  SaveCollectionDraftResponseData,
  SubmitCollectionContentRequest,
  SubmitCollectionContentResponseData,
} from '@contracts/member/my-collections';

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
 * 提供会员回看已领取藏品的最小查询能力，用于验证激活结果。
 */
@Injectable()
export class MyCollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memberContextService: MemberContextService,
  ) {}

  /**
   * 查询当前会员名下藏品列表。
   * 当前支持 x-member-id 或 mock bearer token 两种会员上下文来源。
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
    const submittedVersion = await this.prisma.$transaction(async (tx) => {
      const updatedVersion = await tx.collectionContentVersion.update({
        where: { id: targetVersion.id },
        data: {
          editStatus: CollectionContentEditStatus.UNDER_REVIEW,
          submittedAt,
        },
      });

      await tx.collectionContentReviewRecord.create({
        data: {
          collectionId: collection.id,
          contentVersionId: targetVersion.id,
          reviewStage: CollectionContentReviewStage.MACHINE,
          reviewStatus: CollectionContentReviewStatus.PENDING_MACHINE,
          reviewSource: CollectionContentReviewSource.SYSTEM,
        },
      });

      return updatedVersion;
    });

    return this.toSubmitCollectionContentResponse(
      submittedVersion,
      toTimestamp(submittedAt),
    );
  }

  /**
   * 将查询结果转换为列表项视图。
   */
  private toMyCollectionListItem(
    collection: Prisma.CollectionGetPayload<{
      include: {
        series: true;
        contentVersions: true;
      };
    }>,
  ): MyCollectionListItem {
    const currentVersion = collection.contentVersions[0];

    return {
      id: collection.id,
      collectionNo: collection.collectionNo,
      status: collection.status,
      seriesName: collection.series.name,
      coverImageUrl: currentVersion?.coverImageUrl ?? null,
      contentPublishStatus: currentVersion?.publishStatus ?? 'UNPUBLISHED',
      claimedAt: toNullableTimestamp(collection.claimedAt),
    };
  }

  /**
   * 转换为当前内容版本视图。
   */
  private toCollectionContentVersionView(
    currentVersion: Prisma.CollectionContentVersionGetPayload<Record<string, never>>,
  ): CollectionContentVersionView {
    return {
      id: currentVersion.id,
      versionNo: currentVersion.versionNo,
      title: currentVersion.title,
      summary: currentVersion.summary,
      coverImageUrl: currentVersion.coverImageUrl ?? null,
      contentPayload: currentVersion.contentPayload as Record<string, unknown>,
      editStatus: currentVersion.editStatus,
      publishStatus: currentVersion.publishStatus,
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
  ): SubmitCollectionContentResponseData {
    return {
      versionId: currentVersion.id,
      editStatus: currentVersion.editStatus,
      reviewStatus: CollectionContentReviewStatus.PENDING_MACHINE,
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
        contentVersions: {
          orderBy: { versionNo: 'desc' },
          take: 1,
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
