import { Injectable } from '@nestjs/common';
import {
  ActivationCodeStatus,
  CollectionContentEditStatus,
  CollectionContentPublishStatus,
  CollectionStatus,
} from '@prisma/client';
import { BizError } from '../../../common/http/biz-error';
import { toTimestamp } from '../../../common/serializers/timestamp';
import { MemberContextService } from '../auth/member-context.service';
import { PrismaService } from '../../../platform/prisma/prisma.service';
import { ActivateCollectionRequestDto } from './dto/activate-collection.request';
import { ActivateCollectionResponseDataDto } from './dto/activate-collection.response';

/**
 * 会员激活藏品服务。
 * 负责校验激活码、归属藏品并初始化空白内容版本。
 */
@Injectable()
export class CollectionActivationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memberContextService: MemberContextService,
  ) {}

  /**
   * 激活藏品。
   * 当前支持 x-member-id 或 mock bearer token 两种会员上下文来源。
   */
  async activateCollection(
    authContext: {
      memberId?: string;
      authorization?: string;
    },
    payload: ActivateCollectionRequestDto,
  ): Promise<ActivateCollectionResponseDataDto> {
    const member = await this.memberContextService.getCurrentActiveMember(authContext);
    const activationCodeValue = payload.activationCode?.trim();

    if (!activationCodeValue) {
      throw new BizError({
        code: 'ACTIVATION_CODE_REQUIRED',
        message: 'activation code is required',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const activationCode = await tx.activationCode.findUnique({
        where: { code: activationCodeValue },
        include: {
          collection: true,
        },
      });

      if (!activationCode) {
        throw new BizError({
          code: 'ACTIVATION_CODE_INVALID',
          message: 'activation code invalid',
          status: 404,
        });
      }

      this.ensureActivationCodeCanBeUsed(activationCode);

      const claimedAt = new Date();

      await tx.activationCode.update({
        where: { id: activationCode.id },
        data: {
          status: ActivationCodeStatus.USED,
          usedByMemberId: member.id,
          usedAt: claimedAt,
        },
      });

      const collection = await tx.collection.update({
        where: { id: activationCode.collectionId },
        data: {
          status: CollectionStatus.OWNED,
          currentOwnerMemberId: member.id,
          claimedAt,
        },
      });

      const existingVersion = await tx.collectionContentVersion.findFirst({
        where: { collectionId: collection.id },
        select: { id: true },
      });

      if (!existingVersion) {
        await tx.collectionContentVersion.create({
          data: {
            collectionId: collection.id,
            versionNo: 1,
            title: '',
            summary: '',
            contentPayload: {},
            editStatus: CollectionContentEditStatus.DRAFT,
            publishStatus: CollectionContentPublishStatus.UNPUBLISHED,
            createdByMemberId: member.id,
          },
        });
      }

      return {
        collection: {
          id: collection.id,
          collectionNo: collection.collectionNo,
          status: CollectionStatus.OWNED,
          claimedAt: toTimestamp(claimedAt),
        },
      };
    });
  }

  /**
   * 校验激活码是否仍可使用。
   */
  private ensureActivationCodeCanBeUsed(activationCode: {
    status: ActivationCodeStatus;
    expiredAt: Date | null;
  }) {
    if (activationCode.status === ActivationCodeStatus.USED) {
      throw new BizError({
        code: 'ACTIVATION_CODE_USED',
        message: 'activation code already used',
      });
    }

    if (activationCode.status === ActivationCodeStatus.VOIDED) {
      throw new BizError({
        code: 'ACTIVATION_CODE_VOIDED',
        message: 'activation code voided',
      });
    }

    if (activationCode.status === ActivationCodeStatus.EXPIRED) {
      throw new BizError({
        code: 'ACTIVATION_CODE_EXPIRED',
        message: 'activation code expired',
      });
    }

    if (
      activationCode.expiredAt &&
      activationCode.expiredAt.getTime() < Date.now()
    ) {
      throw new BizError({
        code: 'ACTIVATION_CODE_EXPIRED',
        message: 'activation code expired',
      });
    }
  }
}
