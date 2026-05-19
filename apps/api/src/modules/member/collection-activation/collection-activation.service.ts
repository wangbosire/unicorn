import { Injectable, Logger } from '@nestjs/common';
import {
  ActivationCodeStatus,
  CollectionContentEditStatus,
  CollectionContentPublishStatus,
  CollectionStatus,
  NotificationMessageType,
} from '@prisma/client';
import { BizError } from '../../../common/http/biz-error';
import { toTimestamp } from '../../../common/serializers/timestamp';
import { MemberContextService } from '../auth/member-context.service';
import { NotificationDispatcherService } from '../../notifications/notification-dispatcher.service';
import { PrismaService } from '../../../platform/prisma/prisma.service';
import type {
  ActivateCollectionRequest,
  ActivateCollectionResponseData,
} from '@contracts/member/collection-activation';

/**
 * 会员激活藏品服务。
 * 负责校验激活码、归属藏品并初始化空白内容版本。
 */
@Injectable()
export class CollectionActivationService {
  private readonly logger = new Logger(CollectionActivationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly memberContextService: MemberContextService,
    private readonly notificationDispatcher: NotificationDispatcherService,
  ) {}

  /**
   * 激活藏品。
   * 当前通过 Bearer access token 解析会员身份；历史 mock token 仅保留兼容校验。
   */
  async activateCollection(
    authContext: {
      memberId?: string;
      authorization?: string;
    },
    payload: ActivateCollectionRequest,
  ): Promise<ActivateCollectionResponseData> {
    const member = await this.memberContextService.getCurrentActiveMember(authContext);
    const activationCodeValue = payload.activationCode?.trim();

    if (!activationCodeValue) {
      this.logger.warn('activation rejected: missing code', {
        event: 'collection.activate.rejected',
        code: 'ACTIVATION_CODE_REQUIRED',
        actor: member.id,
      });
      throw new BizError({
        code: 'ACTIVATION_CODE_REQUIRED',
        message: 'activation code is required',
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
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

    this.logger.log('collection activated', {
      event: 'collection.activated',
      actor: member.id,
      collectionId: result.collection.id,
      collectionNo: result.collection.collectionNo,
      fromStatus: CollectionStatus.PENDING_CLAIM,
      toStatus: CollectionStatus.OWNED,
    });

    await this.notificationDispatcher.dispatch({
      memberId: member.id,
      messageType: NotificationMessageType.ACTIVATE_SUCCESS,
      payload: { collectionName: result.collection.collectionNo },
    });

    return result;
  }

  /**
   * 校验激活码是否仍可使用。
   */
  private ensureActivationCodeCanBeUsed(activationCode: {
    id: string;
    status: ActivationCodeStatus;
    expiredAt: Date | null;
  }) {
    const reject = (code: string, message: string) => {
      this.logger.warn(`activation rejected: ${code}`, {
        event: 'collection.activate.rejected',
        code,
        activationCodeId: activationCode.id,
        codeStatus: activationCode.status,
      });
      throw new BizError({ code, message });
    };

    if (activationCode.status === ActivationCodeStatus.USED) {
      reject('ACTIVATION_CODE_USED', 'activation code already used');
    }

    if (activationCode.status === ActivationCodeStatus.VOIDED) {
      reject('ACTIVATION_CODE_VOIDED', 'activation code voided');
    }

    if (activationCode.status === ActivationCodeStatus.EXPIRED) {
      reject('ACTIVATION_CODE_EXPIRED', 'activation code expired');
    }

    if (
      activationCode.expiredAt &&
      activationCode.expiredAt.getTime() < Date.now()
    ) {
      reject('ACTIVATION_CODE_EXPIRED', 'activation code expired');
    }
  }
}
