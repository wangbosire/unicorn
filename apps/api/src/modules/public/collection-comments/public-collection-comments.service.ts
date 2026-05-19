import { Injectable, Logger } from '@nestjs/common';
import { CollectionCommentStatus } from '@prisma/client';
import type { ListPublicCollectionCommentsResponseData } from '@contracts/public/collections';
import { BizError } from '../../../common/http/biz-error';
import { PrismaService } from '../../../platform/prisma/prisma.service';

/**
 * 公开评论读服务。
 * 仅返回已通过审核并已公开的评论与其二级回复，不暴露内部审核信息。
 */
@Injectable()
export class PublicCollectionCommentsService {
  // 公开读服务：4xx 由 ApiExceptionFilter 统一记日志，
  // 此处仅保留 Logger 实例供未来扩展使用。
  private readonly logger = new Logger(PublicCollectionCommentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 按公开展示标识查询评论列表。
   */
  async listPublicCollectionCommentsBySlug(
    slug: string,
  ): Promise<ListPublicCollectionCommentsResponseData> {
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
      select: { id: true, collectionNo: true },
    });

    if (!collection) {
      throw new BizError({
        code: 'RESOURCE_NOT_FOUND',
        message: 'public collection not found',
        status: 404,
      });
    }

    const rows = await this.prisma.collectionComment.findMany({
      where: {
        collectionId: collection.id,
        parentCommentId: null,
        status: {
          in: [
            CollectionCommentStatus.MACHINE_APPROVED,
            CollectionCommentStatus.MANUAL_APPROVED,
          ],
        },
      },
      include: {
        member: {
          select: { nickname: true, avatarUrl: true },
        },
        replies: {
          where: {
            status: {
              in: [
                CollectionCommentStatus.MACHINE_APPROVED,
                CollectionCommentStatus.MANUAL_APPROVED,
              ],
            },
          },
          include: {
            member: {
              select: { nickname: true, avatarUrl: true },
            },
          },
          orderBy: { publishedAt: 'asc' },
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });

    return {
      collectionNo: collection.collectionNo,
      slug: collection.collectionNo,
      topLevelCommentCount: rows.length,
      totalCommentCount: rows.reduce((sum, row) => sum + 1 + row.replies.length, 0),
      items: rows.map((row) => ({
        commentId: row.id,
        memberNickname: row.member.nickname,
        memberAvatarUrl: row.member.avatarUrl ?? null,
        content: row.content,
        publishedAt: row.publishedAt?.toISOString() ?? row.createdAt.toISOString(),
        replyCount: row.replies.length,
        replies: row.replies.map((reply) => ({
          commentId: reply.id,
          rootCommentId: reply.rootCommentId ?? null,
          memberNickname: reply.member.nickname,
          memberAvatarUrl: reply.member.avatarUrl ?? null,
          content: reply.content,
          publishedAt:
            reply.publishedAt?.toISOString() ?? reply.createdAt.toISOString(),
        })),
      })),
    };
  }
}
