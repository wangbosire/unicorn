import { Injectable } from '@nestjs/common';
import {
  CollectionContentEditStatus,
  CollectionContentPublishStatus,
} from '@prisma/client';
import type { GetPublicCollectionResponseData } from '@contracts/public/collections';
import { BizError } from '../../../common/http/biz-error';
import { PrismaService } from '../../../platform/prisma/prisma.service';

/**
 * 公开展示读服务。
 * 仅返回已通过机审（或等价策略）且处于公开发布态的内容快照。
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
        currentOwnerMember: true,
        contentVersions: {
          where: {
            publishStatus: CollectionContentPublishStatus.PUBLISHED,
            editStatus: CollectionContentEditStatus.APPROVED,
          },
          orderBy: { publishedAt: 'desc' },
          take: 1,
        },
      },
    });

    const publishedVersion = collection?.contentVersions[0];
    const owner = collection?.currentOwnerMember;

    if (!collection || !publishedVersion || !owner) {
      throw new BizError({
        code: 'RESOURCE_NOT_FOUND',
        message: 'public collection not found',
        status: 404,
      });
    }

    if (!publishedVersion.publishedAt) {
      throw new BizError({
        code: 'RESOURCE_NOT_FOUND',
        message: 'public collection not found',
        status: 404,
      });
    }

    return {
      collectionNo: collection.collectionNo,
      slug: collection.collectionNo,
      title: publishedVersion.title,
      summary: publishedVersion.summary,
      coverImageUrl: publishedVersion.coverImageUrl,
      contentPayload: publishedVersion.contentPayload as Record<string, unknown>,
      owner: {
        memberNo: owner.memberNo,
        nickname: owner.nickname,
      },
      publishedAt: publishedVersion.publishedAt.toISOString(),
    };
  }
}
