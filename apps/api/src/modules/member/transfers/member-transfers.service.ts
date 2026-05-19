import { Injectable, Logger } from '@nestjs/common';
import {
  CollectionContentEditStatus,
  CollectionTransferMode,
  CollectionTransferStatus,
  CollectionStatus,
  MemberStatus,
  NotificationMessageType,
  Prisma,
} from '@prisma/client';
import type {
  AcceptMemberTransferParams,
  AcceptMemberTransferCodeRequest,
  AcceptMemberTransferResponseData,
  CancelMemberTransferParams,
  CancelMemberTransferResponseData,
  CreateMemberTransferRequest,
  CreateMemberTransferResponseData,
  ListMemberTransfersQuery,
  ListMemberTransfersResponseData,
  MemberTransferListItem,
} from '@contracts/member/transfers';
import type { GetCollectionContentParams } from '@contracts/member/my-collections';
import { z } from 'zod';
import { BizError } from '../../../common/http/biz-error';
import { buildPaginatedResult, parsePaginationQuery } from '../../../common/pagination/pagination';
import { toNullableTimestamp, toTimestamp } from '../../../common/serializers/timestamp';
import { parseOptionalEnumValue } from '../../../common/validation/enum';
import { optionalTextField, requiredIdField } from '../../../common/validation/fields';
import { parseWithSchema } from '../../../common/validation/schema';
import { NotificationDispatcherService } from '../../notifications/notification-dispatcher.service';
import { PrismaService } from '../../../platform/prisma/prisma.service';
import { MemberContextService } from '../auth/member-context.service';

const getCollectionContentParamsSchema = z.object({
  collectionId: requiredIdField('collection'),
});

const createMemberTransferRequestSchema = z.object({
  transferMode: z.enum([
    CollectionTransferMode.DIRECT_MEMBER,
    CollectionTransferMode.TRANSFER_CODE,
  ]),
  toMemberNo: optionalTextField('toMemberNo'),
});

const acceptMemberTransferParamsSchema = z.object({
  transferId: requiredIdField('transfer'),
});

const cancelMemberTransferParamsSchema = z.object({
  transferId: requiredIdField('transfer'),
});

const acceptMemberTransferCodeRequestSchema = z.object({
  transferCode: z.string().trim().min(1, 'transferCode is required'),
});

const DEFAULT_TRANSFER_EXPIRE_DAYS = 7;

/**
 * 当前会员转让服务。
 * 提供最小可用的记录查询、发起转让与接收转让闭环。
 */
@Injectable()
export class MemberTransfersService {
  private readonly logger = new Logger(MemberTransfersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly memberContextService: MemberContextService,
    private readonly notificationDispatcher: NotificationDispatcherService,
  ) {}

  /**
   * 查询当前会员的转让记录。
   */
  async listMemberTransfers(
    authContext: {
      memberId?: string;
      authorization?: string;
    },
    query: ListMemberTransfersQuery,
  ): Promise<ListMemberTransfersResponseData> {
    const member = await this.memberContextService.getCurrentActiveMember(authContext);
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const direction = query.direction ?? 'all';
    const collectionNo = query.collectionNo?.trim();
    const status = this.parseTransferStatus(query.status);

    const directionWhere =
      direction === 'outgoing'
        ? { fromMemberId: member.id }
        : direction === 'incoming'
          ? { OR: [{ toMemberId: member.id }, { toMemberId: null, status: CollectionTransferStatus.PENDING_ACCEPT }] }
          : {
              OR: [
                { fromMemberId: member.id },
                { toMemberId: member.id },
                { toMemberId: null, status: CollectionTransferStatus.PENDING_ACCEPT },
              ],
            };

    const where: Prisma.CollectionTransferOrderWhereInput = {
      ...directionWhere,
      ...(collectionNo ? { collection: { collectionNo } } : {}),
      ...(status ? { status } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.collectionTransferOrder.findMany({
        where,
        include: {
          collection: {
            select: {
              id: true,
              collectionNo: true,
            },
          },
          fromMember: {
            select: {
              id: true,
              memberNo: true,
              nickname: true,
            },
          },
          toMember: {
            select: {
              id: true,
              memberNo: true,
              nickname: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.collectionTransferOrder.count({ where }),
    ]);

    return buildPaginatedResult({
      items: rows.map((row) => this.toMemberTransferListItem(member.id, row)),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 发起当前会员某件藏品的转让。
   */
  async createMemberTransfer(
    authContext: {
      memberId?: string;
      authorization?: string;
    },
    params: GetCollectionContentParams,
    payload: CreateMemberTransferRequest,
  ): Promise<CreateMemberTransferResponseData> {
    const member = await this.memberContextService.getCurrentActiveMember(authContext);
    const parsedParams = parseWithSchema(getCollectionContentParamsSchema, params);
    const input = parseWithSchema(createMemberTransferRequestSchema, payload);

    const collection = await this.prisma.collection.findUnique({
      where: { id: parsedParams.collectionId },
      include: {
        contentVersions: {
          orderBy: { versionNo: 'desc' },
          take: 20,
        },
      },
    });

    if (!collection || collection.currentOwnerMemberId !== member.id) {
      throw new BizError({
        code: 'COLLECTION_NOT_OWNED_BY_MEMBER',
        message: 'collection does not belong to current member',
        status: 404,
      });
    }

    if (collection.status !== CollectionStatus.OWNED) {
      throw new BizError({
        code: 'COLLECTION_NOT_TRANSFERABLE',
        message: 'collection is not transferable',
      });
    }

    const latestVersion = collection.contentVersions[0] ?? null;
    if (
      latestVersion &&
      (latestVersion.editStatus === CollectionContentEditStatus.DRAFT ||
        latestVersion.editStatus === CollectionContentEditStatus.UNDER_REVIEW)
    ) {
      throw new BizError({
        code: 'COLLECTION_NOT_TRANSFERABLE',
        message: 'collection content is not ready for transfer',
      });
    }

    const existingPending = await this.prisma.collectionTransferOrder.findFirst({
      where: {
        collectionId: collection.id,
        status: CollectionTransferStatus.PENDING_ACCEPT,
      },
      select: { id: true },
    });

    if (existingPending) {
      throw new BizError({
        code: 'COLLECTION_TRANSFER_ALREADY_PENDING',
        message: 'an active transfer already exists',
      });
    }

    let targetMember:
      | {
          id: string;
          memberNo: string;
          nickname: string;
          status: MemberStatus;
        }
      | null = null;

    if (input.transferMode === CollectionTransferMode.DIRECT_MEMBER) {
      if (!input.toMemberNo) {
        throw new BizError({
          code: 'VALIDATION_ERROR',
          message: 'toMemberNo is required for direct transfer',
        });
      }

      targetMember = await this.prisma.member.findUnique({
        where: { memberNo: input.toMemberNo.trim() },
        select: {
          id: true,
          memberNo: true,
          nickname: true,
          status: true,
        },
      });

      if (!targetMember || targetMember.status !== MemberStatus.ACTIVE) {
        throw new BizError({
          code: 'TRANSFER_TARGET_MEMBER_NOT_FOUND',
          message: 'target member not found',
          status: 404,
        });
      }

      if (targetMember.id === member.id) {
        throw new BizError({
          code: 'TRANSFER_TARGET_MEMBER_INVALID',
          message: 'cannot transfer to self',
        });
      }
    }

    const createdAt = new Date();
    const expiredAt = new Date(
      createdAt.getTime() + DEFAULT_TRANSFER_EXPIRE_DAYS * 24 * 60 * 60 * 1000,
    );

    const fromMemberInfo = await this.prisma.member.findUnique({
      where: { id: member.id },
      select: { memberNo: true },
    });

    const created = await this.prisma.collectionTransferOrder.create({
      data: {
        transferNo: await this.generateTransferNo(),
        collectionId: collection.id,
        fromMemberId: member.id,
        toMemberId: targetMember?.id ?? null,
        transferMode: input.transferMode,
        transferCode:
          input.transferMode === CollectionTransferMode.TRANSFER_CODE
            ? this.generateTransferCode()
            : null,
        status: CollectionTransferStatus.PENDING_ACCEPT,
        expiredAt,
        createdAt,
      },
      include: {
        collection: {
          select: {
            id: true,
            collectionNo: true,
          },
        },
        toMember: {
          select: {
            memberNo: true,
            nickname: true,
          },
        },
      },
    });

    this.logger.log('transfer created', {
      event: 'transfer.created',
      transferId: created.id,
      transferNo: created.transferNo,
      collectionId: created.collection.id,
      collectionNo: created.collection.collectionNo,
      fromMemberId: member.id,
      toMemberId: targetMember?.id ?? null,
      transferMode: created.transferMode,
    });

    if (targetMember) {
      await this.notificationDispatcher.dispatch({
        memberId: targetMember.id,
        messageType: NotificationMessageType.TRANSFER_PENDING_ACCEPT,
        payload: {
          collectionName: created.collection.collectionNo,
          fromMemberNo: fromMemberInfo?.memberNo ?? '',
        },
      });
    }

    return {
      transferId: created.id,
      transferNo: created.transferNo,
      collectionId: created.collection.id,
      collectionNo: created.collection.collectionNo,
      transferMode: created.transferMode,
      status: created.status,
      transferCode: created.transferCode,
      toMemberNo: created.toMember?.memberNo ?? null,
      toMemberNickname: created.toMember?.nickname ?? null,
      expiredAt: toNullableTimestamp(created.expiredAt),
      createdAt: toTimestamp(created.createdAt),
    };
  }

  /**
   * 接收一条转让。
   */
  async acceptMemberTransfer(
    authContext: {
      memberId?: string;
      authorization?: string;
    },
    params: AcceptMemberTransferParams,
  ): Promise<AcceptMemberTransferResponseData> {
    const member = await this.memberContextService.getCurrentActiveMember(authContext);
    const parsedParams = parseWithSchema(acceptMemberTransferParamsSchema, params);
    return this.acceptTransferByResolver(member.id, () =>
      this.prisma.collectionTransferOrder.findUnique({
        where: { id: parsedParams.transferId },
        include: {
          collection: {
            select: {
              id: true,
              collectionNo: true,
            },
          },
        },
      }),
    );
  }

  /**
   * 发起方撤销一条待接收转让。
   * 仅允许 fromMember 在 PENDING_ACCEPT 状态下撤销；其他状态拒绝。
   */
  async cancelMemberTransfer(
    authContext: {
      memberId?: string;
      authorization?: string;
    },
    params: CancelMemberTransferParams,
  ): Promise<CancelMemberTransferResponseData> {
    const member = await this.memberContextService.getCurrentActiveMember(authContext);
    const parsedParams = parseWithSchema(cancelMemberTransferParamsSchema, params);

    const transfer = await this.prisma.collectionTransferOrder.findUnique({
      where: { id: parsedParams.transferId },
      include: {
        collection: { select: { id: true, collectionNo: true } },
      },
    });

    if (!transfer) {
      this.logger.warn('cancel rejected: transfer not found', {
        event: 'transfer.cancel.rejected',
        code: 'TRANSFER_NOT_FOUND',
        transferId: parsedParams.transferId,
        actor: member.id,
      });
      throw new BizError({
        code: 'TRANSFER_NOT_FOUND',
        message: 'transfer not found',
        status: 404,
      });
    }

    if (transfer.fromMemberId !== member.id) {
      this.logger.warn('cancel rejected: not initiator', {
        event: 'transfer.cancel.rejected',
        code: 'TRANSFER_CANCEL_FORBIDDEN',
        transferId: transfer.id,
        actor: member.id,
        fromMemberId: transfer.fromMemberId,
      });
      throw new BizError({
        code: 'TRANSFER_CANCEL_FORBIDDEN',
        message: 'only initiator can cancel this transfer',
        status: 403,
      });
    }

    if (transfer.status !== CollectionTransferStatus.PENDING_ACCEPT) {
      this.logger.warn('cancel rejected: status invalid', {
        event: 'transfer.cancel.rejected',
        code: 'TRANSFER_STATUS_INVALID',
        transferId: transfer.id,
        transferStatus: transfer.status,
      });
      throw new BizError({
        code: 'TRANSFER_STATUS_INVALID',
        message: 'only pending transfers can be cancelled',
      });
    }

    const cancelledAt = new Date();
    const cancelled = await this.prisma.collectionTransferOrder.update({
      where: { id: transfer.id },
      data: { status: CollectionTransferStatus.CANCELLED },
    });

    this.logger.log('transfer cancelled', {
      event: 'transfer.cancelled',
      transferId: transfer.id,
      transferNo: cancelled.transferNo,
      collectionNo: transfer.collection.collectionNo,
      actor: member.id,
      fromStatus: CollectionTransferStatus.PENDING_ACCEPT,
      toStatus: CollectionTransferStatus.CANCELLED,
    });

    if (transfer.toMemberId) {
      await this.notificationDispatcher.dispatch({
        memberId: transfer.toMemberId,
        messageType: NotificationMessageType.TRANSFER_CANCELLED,
        payload: { collectionName: transfer.collection.collectionNo },
      });
    }

    return {
      transferId: cancelled.id,
      transferNo: cancelled.transferNo,
      collectionId: transfer.collection.id,
      collectionNo: transfer.collection.collectionNo,
      status: cancelled.status,
      cancelledAt: toTimestamp(cancelledAt),
    };
  }

  /**
   * 使用转让码接收一条待接收转让。
   */
  async acceptMemberTransferByCode(
    authContext: {
      memberId?: string;
      authorization?: string;
    },
    payload: AcceptMemberTransferCodeRequest,
  ): Promise<AcceptMemberTransferResponseData> {
    const member = await this.memberContextService.getCurrentActiveMember(authContext);
    const input = parseWithSchema(acceptMemberTransferCodeRequestSchema, payload);

    return this.acceptTransferByResolver(member.id, () =>
      this.prisma.collectionTransferOrder.findFirst({
        where: {
          transferCode: input.transferCode.trim(),
          transferMode: CollectionTransferMode.TRANSFER_CODE,
        },
        include: {
          collection: {
            select: {
              id: true,
              collectionNo: true,
            },
          },
        },
      }),
    );
  }

  private parseTransferStatus(
    value: string | undefined,
  ): CollectionTransferStatus | undefined {
    return parseOptionalEnumValue(
      value,
      Object.values(CollectionTransferStatus),
      'INVALID_COLLECTION_TRANSFER_STATUS',
      'collection transfer status is invalid',
    );
  }

  private toMemberTransferListItem(
    currentMemberId: string,
    row: Prisma.CollectionTransferOrderGetPayload<{
      include: {
        collection: {
          select: {
            id: true;
            collectionNo: true;
          };
        };
        fromMember: {
          select: {
            id: true;
            memberNo: true;
            nickname: true;
          };
        };
        toMember: {
          select: {
            id: true;
            memberNo: true;
            nickname: true;
          };
        };
      };
    }>,
  ): MemberTransferListItem {
    const direction = row.fromMember.id === currentMemberId ? 'outgoing' : 'incoming';
    const counterpart =
      direction === 'outgoing'
        ? row.toMember
        : row.fromMember;

    return {
      transferId: row.id,
      transferNo: row.transferNo,
      collectionId: row.collection.id,
      collectionNo: row.collection.collectionNo,
      direction,
      transferMode: row.transferMode,
      status: row.status,
      transferCode: row.transferCode,
      counterpartMemberNo: counterpart?.memberNo ?? null,
      counterpartNickname: counterpart?.nickname ?? null,
      expiredAt: toNullableTimestamp(row.expiredAt),
      completedAt: toNullableTimestamp(row.completedAt),
      createdAt: toTimestamp(row.createdAt),
    };
  }

  private async generateTransferNo(): Promise<string> {
    const count = await this.prisma.collectionTransferOrder.count();

    for (let offset = 1; offset <= 100; offset += 1) {
      const transferNo = `TR-${String(count + offset).padStart(6, '0')}`;
      const existing = await this.prisma.collectionTransferOrder.findUnique({
        where: { transferNo },
        select: { id: true },
      });

      if (!existing) {
        return transferNo;
      }
    }

    throw new BizError({
      code: 'TRANSFER_NO_GENERATION_FAILED',
      message: 'transfer number generation failed',
      status: 500,
    });
  }

  private generateTransferCode(): string {
    return `XFER-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  }

  private async acceptTransferByResolver(
    memberId: string,
    resolver: () => Promise<TransferAcceptCandidate | null>,
  ): Promise<AcceptMemberTransferResponseData> {
    const candidate = await resolver();
    const transfer = await this.ensureTransferAcceptable(candidate, memberId);

    const completedAt = new Date();
    const result = await this.applyTransferAcceptance(transfer, memberId, completedAt);
    await this.notifyOnTransferAcceptance(result.transfer, transfer.collection.collectionNo, memberId);

    return {
      transferId: result.transfer.id,
      transferNo: result.transfer.transferNo,
      collectionId: transfer.collection.id,
      collectionNo: transfer.collection.collectionNo,
      status: result.transfer.status,
      currentOwnerMemberId: result.member.id,
      currentOwnerMemberNo: result.member.memberNo,
      currentOwnerNickname: result.member.nickname,
      completedAt: toTimestamp(completedAt),
    };
  }

  /**
   * 校验候选转让是否对当前会员可接收：缺失、状态、过期、不属于自己。
   * 过期分支会落库并触发通知，并以 `TRANSFER_EXPIRED` 拒绝当次接收。
   * 校验通过返回非空转让，便于调用方继续使用。
   */
  private async ensureTransferAcceptable(
    transfer: TransferAcceptCandidate | null,
    memberId: string,
  ): Promise<TransferAcceptCandidate> {
    if (!transfer) {
      this.logger.warn('accept rejected: transfer not found', {
        event: 'transfer.accept.rejected',
        code: 'TRANSFER_NOT_FOUND',
        actor: memberId,
      });
      throw new BizError({
        code: 'TRANSFER_NOT_FOUND',
        message: 'transfer not found',
        status: 404,
      });
    }

    if (transfer.status !== CollectionTransferStatus.PENDING_ACCEPT) {
      this.logger.warn('accept rejected: status invalid', {
        event: 'transfer.accept.rejected',
        code: 'TRANSFER_STATUS_INVALID',
        transferId: transfer.id,
        transferStatus: transfer.status,
      });
      throw new BizError({
        code: 'TRANSFER_STATUS_INVALID',
        message: 'transfer is not pending accept',
      });
    }

    if (transfer.expiredAt && transfer.expiredAt.getTime() <= Date.now()) {
      await this.expireTransferAndNotify(transfer);
      throw new BizError({
        code: 'TRANSFER_EXPIRED',
        message: 'transfer expired',
      });
    }

    if (
      transfer.transferMode === CollectionTransferMode.DIRECT_MEMBER &&
      transfer.toMemberId !== memberId
    ) {
      this.logger.warn('accept rejected: not assignee', {
        event: 'transfer.accept.rejected',
        code: 'TRANSFER_ACCEPT_FORBIDDEN',
        transferId: transfer.id,
        actor: memberId,
        toMemberId: transfer.toMemberId,
      });
      throw new BizError({
        code: 'TRANSFER_ACCEPT_FORBIDDEN',
        message: 'transfer is not assigned to current member',
        status: 403,
      });
    }

    return transfer;
  }

  /** 标记转让为 `EXPIRED` 并通知发起方，仅在接收时触发。 */
  private async expireTransferAndNotify(
    transfer: TransferAcceptCandidate,
  ): Promise<void> {
    const expiredOrder = await this.prisma.collectionTransferOrder.update({
      where: { id: transfer.id },
      data: { status: CollectionTransferStatus.EXPIRED },
      select: { fromMemberId: true },
    });
    this.logger.log('transfer expired on accept', {
      event: 'transfer.expired',
      transferId: transfer.id,
      collectionNo: transfer.collection.collectionNo,
      fromMemberId: expiredOrder.fromMemberId,
      fromStatus: CollectionTransferStatus.PENDING_ACCEPT,
      toStatus: CollectionTransferStatus.EXPIRED,
    });
    await this.notificationDispatcher.dispatch({
      memberId: expiredOrder.fromMemberId,
      messageType: NotificationMessageType.TRANSFER_EXPIRED,
      payload: { collectionName: transfer.collection.collectionNo },
    });
  }

  /** 事务内完成接收：更新转让单、转移持有人、回填新持有人视图。 */
  private async applyTransferAcceptance(
    transfer: TransferAcceptCandidate,
    memberId: string,
    completedAt: Date,
  ): Promise<{
    transfer: Prisma.CollectionTransferOrderGetPayload<Record<string, never>>;
    member: { id: string; memberNo: string; nickname: string };
  }> {
    return this.prisma.$transaction(async (tx) => {
      const updatedTransfer = await tx.collectionTransferOrder.update({
        where: { id: transfer.id },
        data: {
          toMemberId: memberId,
          status: CollectionTransferStatus.COMPLETED,
          completedAt,
        },
      });

      await tx.collection.update({
        where: { id: transfer.collection.id },
        data: {
          currentOwnerMemberId: memberId,
        },
      });

      const hydratedMember = await tx.member.findUnique({
        where: { id: memberId },
        select: {
          id: true,
          memberNo: true,
          nickname: true,
        },
      });

      if (!hydratedMember) {
        throw new BizError({
          code: 'UNAUTHORIZED',
          message: 'member context missing',
          status: 401,
        });
      }

      return {
        transfer: updatedTransfer,
        member: hydratedMember,
      };
    });
  }

  /** 接收完成后记日志并通知发起方。 */
  private async notifyOnTransferAcceptance(
    updatedTransfer: Prisma.CollectionTransferOrderGetPayload<Record<string, never>>,
    collectionNo: string,
    memberId: string,
  ): Promise<void> {
    this.logger.log('transfer completed', {
      event: 'transfer.completed',
      transferId: updatedTransfer.id,
      transferNo: updatedTransfer.transferNo,
      collectionNo,
      fromMemberId: updatedTransfer.fromMemberId,
      toMemberId: memberId,
      fromStatus: CollectionTransferStatus.PENDING_ACCEPT,
      toStatus: CollectionTransferStatus.COMPLETED,
    });

    await this.notificationDispatcher.dispatch({
      memberId: updatedTransfer.fromMemberId,
      messageType: NotificationMessageType.TRANSFER_COMPLETED,
      payload: { collectionName: collectionNo },
    });
  }
}

type TransferAcceptCandidate = Prisma.CollectionTransferOrderGetPayload<{
  include: {
    collection: {
      select: {
        id: true;
        collectionNo: true;
      };
    };
  };
}>;
