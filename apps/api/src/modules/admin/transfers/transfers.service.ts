import { Injectable, Logger } from '@nestjs/common';
import {
  CollectionTransferMode,
  CollectionTransferOperationType,
  CollectionTransferStatus,
  NotificationMessageType,
  Prisma,
} from '@prisma/client';
import type {
  AdminTransferOrderListItem,
  AdminTransferOperationRecordListItem,
  CompleteTransferOrderRequest,
  CompleteTransferOrderResponseData,
  ExpireTransferOrderRequest,
  ExpireTransferOrderResponseData,
  GetTransferOrderHistoryResponseData,
  GetTransferOperationsOverviewResponseData,
  ListTransferOperationRecordsQuery,
  ListTransferOperationRecordsResponseData,
  ListTransferOrdersQuery,
  ListTransferOrdersResponseData,
  RollbackTransferOrderRequest,
  RollbackTransferOrderResponseData,
  SyncTransferOrderOwnerRequest,
  SyncTransferOrderOwnerResponseData,
} from '@contracts/admin/transfers';
import { BizError } from '../../../common/http/biz-error';
import {
  buildPaginatedResult,
  parsePaginationQuery,
} from '../../../common/pagination/pagination';
import {
  toNullableTimestamp,
  toTimestamp,
} from '../../../common/serializers/timestamp';
import { parseWithSchema } from '../../../common/validation/schema';
import { parseOptionalEnumValue } from '../../../common/validation/enum';
import { requiredIdField } from '../../../common/validation/fields';
import { NotificationDispatcherService } from '../../notifications/notification-dispatcher.service';
import { PrismaService } from '../../../platform/prisma/prisma.service';
import { z } from 'zod';
import {
  detectTransferOrderAnomaly,
  TRANSFER_ORDER_ANOMALY_CODES,
  type TransferOrderAnomalyCode,
} from './transfer-order-anomaly';

const expireTransferOrderRequestSchema = z.object({
  reason: z.string().trim().min(1, 'expire reason is required'),
});
const completeTransferOrderRequestSchema = z.object({
  reason: z.string().trim().min(1, 'complete reason is required'),
});
const rollbackTransferOrderRequestSchema = z.object({
  reason: z.string().trim().min(1, 'rollback reason is required'),
});
const syncTransferOrderOwnerRequestSchema = z.object({
  reason: z.string().trim().min(1, 'sync owner reason is required'),
});
const TRANSFER_OPERATION_ACTION_LABELS = {
  ADMIN_EXPIRE: '释放超时单',
  ADMIN_SYNC_OWNER: '修复归属',
  ADMIN_FORCE_COMPLETE: '强制完成',
  ADMIN_FORCE_ROLLBACK: '强制回滚',
} as const;

type TransferOperationSnapshot = {
  status: string | null;
  currentOwnerMemberId: string | null;
  toMemberId: string | null;
  expiredAt: number | null;
  completedAt: number | null;
};

/**
 * 后台转让记录服务。
 * 当前提供转让单分页查询、异常态识别与超时释放能力。
 */
@Injectable()
export class TransfersService {
  /** 单条转让运营时间线的返回上限，防止异常数据一次性拉满。 */
  private static readonly TRANSFER_HISTORY_MAX = 200;

  // 4xx/异常由 ApiExceptionFilter 统一记日志；运营处置动作额外记结构化留痕。
  private readonly logger = new Logger(TransfersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationDispatcher: NotificationDispatcherService,
  ) {}

  /**
   * 分页查询后台转让记录。
   */
  async listTransferOrders(
    query: ListTransferOrdersQuery,
  ): Promise<ListTransferOrdersResponseData> {
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const collectionNo = query.collectionNo?.trim();
    const fromMemberNo = query.fromMemberNo?.trim();
    const toMemberNo = query.toMemberNo?.trim();
    const transferMode = this.parseTransferMode(query.transferMode);
    const status = this.parseTransferStatus(query.status);
    const anomalyCode = this.parseAnomalyCode(query.anomalyCode);

    const where: Prisma.CollectionTransferOrderWhereInput = {
      ...(collectionNo ? { collection: { collectionNo } } : {}),
      ...(fromMemberNo ? { fromMember: { memberNo: fromMemberNo } } : {}),
      ...(toMemberNo ? { toMember: { memberNo: toMemberNo } } : {}),
      ...(transferMode ? { transferMode } : {}),
      ...(status ? { status } : {}),
    };

    if (anomalyCode) {
      const anomalyWhere = this.buildAnomalyCandidateWhere(where, anomalyCode);
      const rows = await this.prisma.collectionTransferOrder.findMany({
        where: anomalyWhere,
        include: {
          collection: {
            select: {
              id: true,
              collectionNo: true,
              currentOwnerMemberId: true,
              series: {
                select: {
                  seriesNo: true,
                  name: true,
                },
              },
              batch: {
                select: {
                  batchNo: true,
                  name: true,
                },
              },
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
      });

      const filteredItems = rows
        .map((row) => this.toAdminTransferOrderListItem(row))
        .filter((row) => row.anomalyCode === anomalyCode);

      return buildPaginatedResult({
        items: filteredItems.slice(pagination.skip, pagination.skip + pagination.take),
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: filteredItems.length,
      });
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.collectionTransferOrder.findMany({
        where,
        include: {
          collection: {
            select: {
              id: true,
              collectionNo: true,
              currentOwnerMemberId: true,
              series: {
                select: {
                  seriesNo: true,
                  name: true,
                },
              },
              batch: {
                select: {
                  batchNo: true,
                  name: true,
                },
              },
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
      items: rows.map((row) => this.toAdminTransferOrderListItem(row)),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 汇总后台转让运营处置累计概览，供运营页头查看补偿规模。
   */
  async getTransferOperationsOverview(): Promise<GetTransferOperationsOverviewResponseData> {
    const [
      grouped,
      latestRecord,
      expiredPendingReleaseRows,
      pendingAcceptOwnerAlreadyTransferredRows,
      completedOwnerMismatchRows,
    ] = await this.prisma.$transaction([
      this.prisma.collectionTransferOperationRecord.groupBy({
        by: ['actionType'],
        _count: {
          _all: true,
        },
      }),
      this.prisma.collectionTransferOperationRecord.findFirst({
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.buildTransferAnomalyCandidateQuery('EXPIRED_PENDING_RELEASE'),
      this.buildTransferAnomalyCandidateQuery(
        'PENDING_ACCEPT_OWNER_ALREADY_TRANSFERRED',
      ),
      this.buildTransferAnomalyCandidateQuery('COMPLETED_OWNER_MISMATCH'),
    ]);

    const counts = new Map<CollectionTransferOperationType, number>();
    for (const row of grouped) {
      counts.set(row.actionType, row._count._all);
    }

    const totalOperationRecords = grouped.reduce(
      (sum, row) => sum + row._count._all,
      0,
    );

    return {
      totalOperationRecords,
      expiredOperations:
        counts.get(CollectionTransferOperationType.ADMIN_EXPIRE) ?? 0,
      forceCompletedOperations:
        counts.get(CollectionTransferOperationType.ADMIN_FORCE_COMPLETE) ?? 0,
      forceRolledBackOperations:
        counts.get(CollectionTransferOperationType.ADMIN_FORCE_ROLLBACK) ?? 0,
      syncedOwnerOperations:
        counts.get(CollectionTransferOperationType.ADMIN_SYNC_OWNER) ?? 0,
      expiredPendingReleaseAnomalies: this.countTransferOrderAnomalies(
        expiredPendingReleaseRows,
        'EXPIRED_PENDING_RELEASE',
      ),
      pendingAcceptOwnerAlreadyTransferredAnomalies:
        this.countTransferOrderAnomalies(
          pendingAcceptOwnerAlreadyTransferredRows,
          'PENDING_ACCEPT_OWNER_ALREADY_TRANSFERRED',
        ),
      completedOwnerMismatchAnomalies: this.countTransferOrderAnomalies(
        completedOwnerMismatchRows,
        'COMPLETED_OWNER_MISMATCH',
      ),
      latestOperationAt: toNullableTimestamp(latestRecord?.createdAt ?? null),
      generatedAt: Date.now(),
    };
  }

  /**
   * 分页查询转让运营处置记录，供后台横向查看补偿动作。
   */
  async listTransferOperationRecords(
    query: ListTransferOperationRecordsQuery,
  ): Promise<ListTransferOperationRecordsResponseData> {
    const pagination = parsePaginationQuery({
      page: query.page,
      pageSize: query.pageSize,
    });
    const collectionNo = query.collectionNo?.trim();
    const transferNo = query.transferNo?.trim();
    const operatorAdminAccountNo = query.operatorAdminAccountNo?.trim();
    const actionType = this.parseTransferOperationType(query.actionType);
    const transferWhere: Prisma.CollectionTransferOrderWhereInput = {
      ...(transferNo ? { transferNo } : {}),
      ...(collectionNo ? { collection: { collectionNo } } : {}),
    };

    const where: Prisma.CollectionTransferOperationRecordWhereInput = {
      ...(actionType ? { actionType } : {}),
      ...(operatorAdminAccountNo
        ? { operatorAdminUser: { accountNo: operatorAdminAccountNo } }
        : {}),
      ...(Object.keys(transferWhere).length > 0 ? { transfer: transferWhere } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.collectionTransferOperationRecord.findMany({
        where,
        include: {
          transfer: {
            select: {
              id: true,
              transferNo: true,
              collection: {
                select: {
                  id: true,
                  collectionNo: true,
                },
              },
            },
          },
          operatorAdminUser: {
            select: {
              id: true,
              accountNo: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.collectionTransferOperationRecord.count({ where }),
    ]);

    return buildPaginatedResult({
      items: rows.map((row) => this.toTransferOperationListItem(row)),
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    });
  }

  /**
   * 查询单条转让单的运营处置留痕时间线。
   */
  async getTransferOrderHistory(
    transferId: string,
  ): Promise<GetTransferOrderHistoryResponseData> {
    const normalizedTransferId = parseWithSchema(
      requiredIdField('transfer'),
      transferId,
    );

    const transfer = await this.prisma.collectionTransferOrder.findUnique({
      where: { id: normalizedTransferId },
      select: {
        id: true,
        transferNo: true,
        operationRecords: {
          include: {
            operatorAdminUser: {
              select: {
                id: true,
                accountNo: true,
                displayName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: TransfersService.TRANSFER_HISTORY_MAX + 1,
        },
      },
    });

    if (!transfer) {
      throw new BizError({
        code: 'TRANSFER_NOT_FOUND',
        message: 'transfer not found',
        status: 404,
      });
    }

    if (transfer.operationRecords.length > TransfersService.TRANSFER_HISTORY_MAX) {
      throw new BizError({
        code: 'TRANSFER_HISTORY_LIMIT_EXCEEDED',
        message: `transfer history exceeds ${TransfersService.TRANSFER_HISTORY_MAX} records`,
        status: 400,
      });
    }

    return {
      transferId: transfer.id,
      transferNo: transfer.transferNo,
      totalRecords: transfer.operationRecords.length,
      items: transfer.operationRecords.map((row) => this.toTransferOperationHistoryItem(row)),
    };
  }

  /**
   * 运营手动释放一条超时未释放的待接收转让。
   * 当前只允许处理已过期但仍停留在 `PENDING_ACCEPT` 的记录。
   */
  async expireTransferOrder(
    transferId: string,
    payload: ExpireTransferOrderRequest,
    operatorAdminUserId: string | null,
  ): Promise<ExpireTransferOrderResponseData> {
    const normalizedTransferId = parseWithSchema(
      requiredIdField('transfer'),
      transferId,
    );
    const input = parseWithSchema(expireTransferOrderRequestSchema, payload);

    const transfer = await this.prisma.collectionTransferOrder.findUnique({
      where: { id: normalizedTransferId },
      include: {
        collection: {
          select: {
            id: true,
            collectionNo: true,
            currentOwnerMemberId: true,
          },
        },
      },
    });

    if (!transfer) {
      throw new BizError({
        code: 'TRANSFER_NOT_FOUND',
        message: 'transfer not found',
        status: 404,
      });
    }

    const anomaly = detectTransferOrderAnomaly({
      status: transfer.status,
      expiredAt: transfer.expiredAt,
      completedAt: transfer.completedAt,
      toMemberId: transfer.toMemberId,
      currentOwnerMemberId: null,
    });

    if (anomaly?.code !== 'EXPIRED_PENDING_RELEASE') {
      throw new BizError({
        code: 'TRANSFER_EXPIRE_NOT_ALLOWED',
        message: 'transfer is not eligible for admin expire',
        status: 409,
      });
    }

    const handledAt = new Date();
    const beforeSnapshot = this.buildTransferOperationSnapshot({
      status: transfer.status,
      currentOwnerMemberId: transfer.collection.currentOwnerMemberId,
      toMemberId: transfer.toMemberId,
      expiredAt: transfer.expiredAt,
      completedAt: transfer.completedAt,
    });
    const afterSnapshot = this.buildTransferOperationSnapshot({
      status: CollectionTransferStatus.EXPIRED,
      currentOwnerMemberId: transfer.collection.currentOwnerMemberId,
      toMemberId: transfer.toMemberId,
      expiredAt: transfer.expiredAt,
      completedAt: transfer.completedAt,
    });
    const expired = await this.prisma.$transaction(async (tx) => {
      const updatedTransfer = await tx.collectionTransferOrder.update({
        where: { id: transfer.id },
        data: {
          status: CollectionTransferStatus.EXPIRED,
        },
        select: {
          id: true,
          transferNo: true,
          fromMemberId: true,
        },
      });

      await tx.collectionTransferOperationRecord.create({
        data: {
          transferId: transfer.id,
          actionType: CollectionTransferOperationType.ADMIN_EXPIRE,
          reason: input.reason,
          beforeSnapshot,
          afterSnapshot,
          operatorAdminUserId,
          createdAt: handledAt,
        },
      });

      return updatedTransfer;
    });

    this.logger.log('transfer manually expired', {
      event: 'admin.transfer.expired',
      transferId: transfer.id,
      transferNo: transfer.transferNo,
      collectionNo: transfer.collection.collectionNo,
      operatorAdminUserId,
      reason: input.reason,
      fromStatus: CollectionTransferStatus.PENDING_ACCEPT,
      toStatus: CollectionTransferStatus.EXPIRED,
    });

    await this.notificationDispatcher.dispatch({
      memberId: expired.fromMemberId,
      messageType: NotificationMessageType.TRANSFER_EXPIRED,
      payload: { collectionName: transfer.collection.collectionNo },
    });

    return {
      transferId: expired.id,
      transferNo: expired.transferNo,
      status: 'EXPIRED',
      handledAt: toTimestamp(handledAt),
    };
  }

  /**
   * 运营将一条已实质到账但仍停留待接收的转让补记为已完成。
   * 当前仅允许处理接收方已成为当前持有人的指定会员转让。
   */
  async completeTransferOrder(
    transferId: string,
    payload: CompleteTransferOrderRequest,
    operatorAdminUserId: string | null,
  ): Promise<CompleteTransferOrderResponseData> {
    const normalizedTransferId = parseWithSchema(
      requiredIdField('transfer'),
      transferId,
    );
    const input = parseWithSchema(completeTransferOrderRequestSchema, payload);

    const transfer = await this.prisma.collectionTransferOrder.findUnique({
      where: { id: normalizedTransferId },
      include: {
        collection: {
          select: {
            id: true,
            collectionNo: true,
            currentOwnerMemberId: true,
          },
        },
      },
    });

    if (!transfer) {
      throw new BizError({
        code: 'TRANSFER_NOT_FOUND',
        message: 'transfer not found',
        status: 404,
      });
    }

    const anomaly = detectTransferOrderAnomaly({
      status: transfer.status,
      expiredAt: transfer.expiredAt,
      completedAt: transfer.completedAt,
      toMemberId: transfer.toMemberId,
      currentOwnerMemberId: transfer.collection.currentOwnerMemberId,
    });

    if (
      anomaly?.code !== 'PENDING_ACCEPT_OWNER_ALREADY_TRANSFERRED' ||
      !transfer.toMemberId
    ) {
      throw new BizError({
        code: 'TRANSFER_COMPLETE_NOT_ALLOWED',
        message: 'transfer is not eligible for admin completion',
        status: 409,
      });
    }

    const handledAt = new Date();
    const beforeSnapshot = this.buildTransferOperationSnapshot({
      status: transfer.status,
      currentOwnerMemberId: transfer.collection.currentOwnerMemberId,
      toMemberId: transfer.toMemberId,
      expiredAt: transfer.expiredAt,
      completedAt: transfer.completedAt,
    });
    const afterSnapshot = this.buildTransferOperationSnapshot({
      status: CollectionTransferStatus.COMPLETED,
      currentOwnerMemberId: transfer.toMemberId,
      toMemberId: transfer.toMemberId,
      expiredAt: transfer.expiredAt,
      completedAt: handledAt,
    });
    const completed = await this.prisma.$transaction(async (tx) => {
      const updatedTransfer = await tx.collectionTransferOrder.update({
        where: { id: transfer.id },
        data: {
          status: CollectionTransferStatus.COMPLETED,
          completedAt: handledAt,
        },
        select: {
          id: true,
          transferNo: true,
          fromMemberId: true,
          toMemberId: true,
        },
      });

      await tx.collectionTransferOperationRecord.create({
        data: {
          transferId: transfer.id,
          actionType: CollectionTransferOperationType.ADMIN_FORCE_COMPLETE,
          reason: input.reason,
          beforeSnapshot,
          afterSnapshot,
          operatorAdminUserId,
          createdAt: handledAt,
        },
      });

      return updatedTransfer;
    });

    this.logger.log('transfer force completed', {
      event: 'admin.transfer.force_completed',
      transferId: transfer.id,
      transferNo: transfer.transferNo,
      collectionId: transfer.collection.id,
      collectionNo: transfer.collection.collectionNo,
      currentOwnerMemberId: transfer.collection.currentOwnerMemberId,
      toMemberId: transfer.toMemberId,
      operatorAdminUserId,
      reason: input.reason,
      fromStatus: CollectionTransferStatus.PENDING_ACCEPT,
      toStatus: CollectionTransferStatus.COMPLETED,
    });

    await this.notificationDispatcher.dispatch({
      memberId: completed.fromMemberId,
      messageType: NotificationMessageType.TRANSFER_COMPLETED,
      payload: { collectionName: transfer.collection.collectionNo },
    });

    return {
      transferId: completed.id,
      transferNo: completed.transferNo,
      status: 'COMPLETED',
      currentOwnerMemberId: completed.toMemberId!,
      handledAt: toTimestamp(handledAt),
    };
  }

  /**
   * 运营将一条已完成转让回滚为发起方持有。
   * 当前仅允许处理 `COMPLETED` 状态的转让，回滚后主状态进入 `ROLLED_BACK`。
   */
  async rollbackTransferOrder(
    transferId: string,
    payload: RollbackTransferOrderRequest,
    operatorAdminUserId: string | null,
  ): Promise<RollbackTransferOrderResponseData> {
    const normalizedTransferId = parseWithSchema(
      requiredIdField('transfer'),
      transferId,
    );
    const input = parseWithSchema(rollbackTransferOrderRequestSchema, payload);

    const transfer = await this.prisma.collectionTransferOrder.findUnique({
      where: { id: normalizedTransferId },
      include: {
        collection: {
          select: {
            id: true,
            collectionNo: true,
            currentOwnerMemberId: true,
          },
        },
      },
    });

    if (!transfer) {
      throw new BizError({
        code: 'TRANSFER_NOT_FOUND',
        message: 'transfer not found',
        status: 404,
      });
    }

    if (transfer.status !== CollectionTransferStatus.COMPLETED) {
      throw new BizError({
        code: 'TRANSFER_ROLLBACK_NOT_ALLOWED',
        message: 'only completed transfers can be rolled back',
        status: 409,
      });
    }

    const handledAt = new Date();
    const beforeSnapshot = this.buildTransferOperationSnapshot({
      status: transfer.status,
      currentOwnerMemberId: transfer.collection.currentOwnerMemberId,
      toMemberId: transfer.toMemberId,
      expiredAt: transfer.expiredAt,
      completedAt: transfer.completedAt,
    });
    const afterSnapshot = this.buildTransferOperationSnapshot({
      status: CollectionTransferStatus.ROLLED_BACK,
      currentOwnerMemberId: transfer.fromMemberId,
      toMemberId: transfer.toMemberId,
      expiredAt: transfer.expiredAt,
      completedAt: null,
    });
    const rolledBack = await this.prisma.$transaction(async (tx) => {
      const updatedTransfer = await tx.collectionTransferOrder.update({
        where: { id: transfer.id },
        data: {
          status: CollectionTransferStatus.ROLLED_BACK,
          completedAt: null,
        },
        select: {
          id: true,
          transferNo: true,
          fromMemberId: true,
          toMemberId: true,
        },
      });

      await tx.collection.update({
        where: { id: transfer.collection.id },
        data: {
          currentOwnerMemberId: transfer.fromMemberId,
        },
      });

      await tx.collectionTransferOperationRecord.create({
        data: {
          transferId: transfer.id,
          actionType: CollectionTransferOperationType.ADMIN_FORCE_ROLLBACK,
          reason: input.reason,
          beforeSnapshot,
          afterSnapshot,
          operatorAdminUserId,
          createdAt: handledAt,
        },
      });

      return updatedTransfer;
    });

    this.logger.log('transfer force rolled back', {
      event: 'admin.transfer.force_rolled_back',
      transferId: transfer.id,
      transferNo: transfer.transferNo,
      collectionId: transfer.collection.id,
      collectionNo: transfer.collection.collectionNo,
      fromMemberId: transfer.fromMemberId,
      toMemberId: transfer.toMemberId,
      fromOwnerMemberId: transfer.collection.currentOwnerMemberId,
      toOwnerMemberId: transfer.fromMemberId,
      operatorAdminUserId,
      reason: input.reason,
      fromStatus: CollectionTransferStatus.COMPLETED,
      toStatus: CollectionTransferStatus.ROLLED_BACK,
    });

    const notifyMemberIds = new Set<string>([
      transfer.fromMemberId,
      ...(transfer.toMemberId ? [transfer.toMemberId] : []),
    ]);
    for (const memberId of notifyMemberIds) {
      await this.notificationDispatcher.dispatch({
        memberId,
        messageType: NotificationMessageType.TRANSFER_ROLLED_BACK,
        payload: { collectionName: transfer.collection.collectionNo },
      });
    }

    return {
      transferId: rolledBack.id,
      transferNo: rolledBack.transferNo,
      status: 'ROLLED_BACK',
      currentOwnerMemberId: transfer.fromMemberId,
      handledAt: toTimestamp(handledAt),
    };
  }

  /**
   * 运营修复一条已完成但归属未对齐的转让。
   * 当前只允许将藏品当前持有人回写为转让单的 `toMemberId`。
   */
  async syncTransferOrderOwner(
    transferId: string,
    payload: SyncTransferOrderOwnerRequest,
    operatorAdminUserId: string | null,
  ): Promise<SyncTransferOrderOwnerResponseData> {
    const normalizedTransferId = parseWithSchema(
      requiredIdField('transfer'),
      transferId,
    );
    const input = parseWithSchema(syncTransferOrderOwnerRequestSchema, payload);

    const transfer = await this.prisma.collectionTransferOrder.findUnique({
      where: { id: normalizedTransferId },
      include: {
        collection: {
          select: {
            id: true,
            collectionNo: true,
            currentOwnerMemberId: true,
          },
        },
      },
    });

    if (!transfer) {
      throw new BizError({
        code: 'TRANSFER_NOT_FOUND',
        message: 'transfer not found',
        status: 404,
      });
    }

    const anomaly = detectTransferOrderAnomaly({
      status: transfer.status,
      expiredAt: transfer.expiredAt,
      completedAt: transfer.completedAt,
      toMemberId: transfer.toMemberId,
      currentOwnerMemberId: transfer.collection.currentOwnerMemberId,
    });

    if (anomaly?.code !== 'COMPLETED_OWNER_MISMATCH' || !transfer.toMemberId) {
      throw new BizError({
        code: 'TRANSFER_OWNER_SYNC_NOT_ALLOWED',
        message: 'transfer is not eligible for owner sync',
        status: 409,
      });
    }

    const handledAt = new Date();
    const beforeSnapshot = this.buildTransferOperationSnapshot({
      status: transfer.status,
      currentOwnerMemberId: transfer.collection.currentOwnerMemberId,
      toMemberId: transfer.toMemberId,
      expiredAt: transfer.expiredAt,
      completedAt: transfer.completedAt,
    });
    const afterSnapshot = this.buildTransferOperationSnapshot({
      status: transfer.status,
      currentOwnerMemberId: transfer.toMemberId,
      toMemberId: transfer.toMemberId,
      expiredAt: transfer.expiredAt,
      completedAt: transfer.completedAt,
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.collection.update({
        where: { id: transfer.collection.id },
        data: {
          currentOwnerMemberId: transfer.toMemberId,
        },
      });

      await tx.collectionTransferOperationRecord.create({
        data: {
          transferId: transfer.id,
          actionType: CollectionTransferOperationType.ADMIN_SYNC_OWNER,
          reason: input.reason,
          beforeSnapshot,
          afterSnapshot,
          operatorAdminUserId,
          createdAt: handledAt,
        },
      });
    });

    this.logger.log('transfer owner synced', {
      event: 'admin.transfer.owner_synced',
      transferId: transfer.id,
      transferNo: transfer.transferNo,
      collectionId: transfer.collection.id,
      collectionNo: transfer.collection.collectionNo,
      fromOwnerMemberId: transfer.collection.currentOwnerMemberId,
      toOwnerMemberId: transfer.toMemberId,
      operatorAdminUserId,
      reason: input.reason,
    });

    return {
      transferId: transfer.id,
      transferNo: transfer.transferNo,
      collectionId: transfer.collection.id,
      currentOwnerMemberId: transfer.toMemberId,
      handledAt: toTimestamp(handledAt),
    };
  }

  private parseTransferMode(
    value: string | undefined,
  ): CollectionTransferMode | undefined {
    return parseOptionalEnumValue(
      value,
      Object.values(CollectionTransferMode),
      'INVALID_COLLECTION_TRANSFER_MODE',
      'collection transfer mode is invalid',
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

  private parseAnomalyCode(
    value: string | undefined,
  ): TransferOrderAnomalyCode | undefined {
    return parseOptionalEnumValue(
      value,
      TRANSFER_ORDER_ANOMALY_CODES,
      'INVALID_TRANSFER_ANOMALY_CODE',
      'transfer anomaly code is invalid',
    );
  }

  private parseTransferOperationType(
    value: string | undefined,
  ): CollectionTransferOperationType | undefined {
    return parseOptionalEnumValue(
      value,
      Object.values(CollectionTransferOperationType),
      'INVALID_TRANSFER_OPERATION_TYPE',
      'transfer operation type is invalid',
    );
  }

  private buildAnomalyCandidateWhere(
    where: Prisma.CollectionTransferOrderWhereInput,
    anomalyCode: TransferOrderAnomalyCode,
  ): Prisma.CollectionTransferOrderWhereInput {
    if (anomalyCode === 'EXPIRED_PENDING_RELEASE') {
      return {
        ...where,
        status: CollectionTransferStatus.PENDING_ACCEPT,
        expiredAt: { lte: new Date() },
      };
    }

    if (anomalyCode === 'PENDING_ACCEPT_OWNER_ALREADY_TRANSFERRED') {
      return {
        ...where,
        status: CollectionTransferStatus.PENDING_ACCEPT,
      };
    }

    return {
      ...where,
      status: CollectionTransferStatus.COMPLETED,
    };
  }

  private buildTransferAnomalyCandidateQuery(anomalyCode: TransferOrderAnomalyCode) {
    return this.prisma.collectionTransferOrder.findMany({
      where: this.buildAnomalyCandidateWhere({}, anomalyCode),
      select: {
        status: true,
        expiredAt: true,
        completedAt: true,
        toMemberId: true,
        collection: {
          select: {
            currentOwnerMemberId: true,
          },
        },
      },
    });
  }

  private countTransferOrderAnomalies(
    rows: Array<{
      status: CollectionTransferStatus;
      expiredAt: Date | null;
      completedAt: Date | null;
      toMemberId: string | null;
      collection: {
        currentOwnerMemberId: string | null;
      };
    }>,
    anomalyCode: TransferOrderAnomalyCode,
  ): number {
    return rows.filter((row) => {
      const anomaly = detectTransferOrderAnomaly({
        status: row.status,
        expiredAt: row.expiredAt,
        completedAt: row.completedAt,
        toMemberId: row.toMemberId,
        currentOwnerMemberId: row.collection.currentOwnerMemberId,
      });
      return anomaly?.code === anomalyCode;
    }).length;
  }

  private toAdminTransferOrderListItem(
    row: Prisma.CollectionTransferOrderGetPayload<{
      include: {
        collection: {
          select: {
            id: true;
            collectionNo: true;
            currentOwnerMemberId: true;
            series: {
              select: {
                seriesNo: true;
                name: true;
              };
            };
            batch: {
              select: {
                batchNo: true;
                name: true;
              };
            };
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
  ): AdminTransferOrderListItem {
    const anomaly = detectTransferOrderAnomaly({
      status: row.status,
      expiredAt: row.expiredAt,
      completedAt: row.completedAt,
      toMemberId: row.toMemberId,
      currentOwnerMemberId: row.collection.currentOwnerMemberId,
    });

    return {
      transferId: row.id,
      transferNo: row.transferNo,
      collectionId: row.collection.id,
      collectionNo: row.collection.collectionNo,
      seriesNo: row.collection.series.seriesNo,
      seriesName: row.collection.series.name,
      batchNo: row.collection.batch.batchNo,
      batchName: row.collection.batch.name,
      fromMemberId: row.fromMember.id,
      fromMemberNo: row.fromMember.memberNo,
      fromMemberNickname: row.fromMember.nickname,
      toMemberId: row.toMember?.id ?? null,
      toMemberNo: row.toMember?.memberNo ?? null,
      toMemberNickname: row.toMember?.nickname ?? null,
      transferMode: row.transferMode,
      transferCode: row.transferCode,
      status: row.status,
      anomalyCode: anomaly?.code ?? null,
      anomalyLabel: anomaly?.label ?? null,
      expiredAt: toNullableTimestamp(row.expiredAt),
      completedAt: toNullableTimestamp(row.completedAt),
      createdAt: toTimestamp(row.createdAt),
    };
  }

  private buildTransferOperationSnapshot(input: {
    status: CollectionTransferStatus;
    currentOwnerMemberId: string | null;
    toMemberId: string | null;
    expiredAt: Date | null;
    completedAt: Date | null;
  }): TransferOperationSnapshot {
    return {
      status: input.status,
      currentOwnerMemberId: input.currentOwnerMemberId,
      toMemberId: input.toMemberId,
      expiredAt: toNullableTimestamp(input.expiredAt),
      completedAt: toNullableTimestamp(input.completedAt),
    };
  }

  private toTransferOperationHistoryItem(
    row: Prisma.CollectionTransferOperationRecordGetPayload<{
      include: {
        operatorAdminUser: {
          select: {
            id: true;
            accountNo: true;
            displayName: true;
          };
        };
      };
    }>,
  ) {
    const beforeSnapshot = this.parseTransferOperationSnapshot(row.beforeSnapshot);
    const afterSnapshot = this.parseTransferOperationSnapshot(row.afterSnapshot);

    return {
      operationRecordId: row.id,
      actionType: row.actionType,
      actionLabel: TRANSFER_OPERATION_ACTION_LABELS[row.actionType],
      reason: row.reason,
      operatorAdminUserId: row.operatorAdminUser?.id ?? null,
      operatorAdminAccountNo: row.operatorAdminUser?.accountNo ?? null,
      operatorAdminDisplayName: row.operatorAdminUser?.displayName ?? null,
      beforeStatus: beforeSnapshot.status,
      afterStatus: afterSnapshot.status,
      beforeCurrentOwnerMemberId: beforeSnapshot.currentOwnerMemberId,
      afterCurrentOwnerMemberId: afterSnapshot.currentOwnerMemberId,
      createdAt: toTimestamp(row.createdAt),
    };
  }

  private toTransferOperationListItem(
    row: Prisma.CollectionTransferOperationRecordGetPayload<{
      include: {
        transfer: {
          select: {
            id: true;
            transferNo: true;
            collection: {
              select: {
                id: true;
                collectionNo: true;
              };
            };
          };
        };
        operatorAdminUser: {
          select: {
            id: true;
            accountNo: true;
            displayName: true;
          };
        };
      };
    }>,
  ): AdminTransferOperationRecordListItem {
    const beforeSnapshot = this.parseTransferOperationSnapshot(row.beforeSnapshot);
    const afterSnapshot = this.parseTransferOperationSnapshot(row.afterSnapshot);

    return {
      operationRecordId: row.id,
      transferId: row.transfer.id,
      transferNo: row.transfer.transferNo,
      collectionId: row.transfer.collection.id,
      collectionNo: row.transfer.collection.collectionNo,
      actionType: row.actionType,
      actionLabel: TRANSFER_OPERATION_ACTION_LABELS[row.actionType],
      reason: row.reason,
      operatorAdminUserId: row.operatorAdminUser?.id ?? null,
      operatorAdminAccountNo: row.operatorAdminUser?.accountNo ?? null,
      operatorAdminDisplayName: row.operatorAdminUser?.displayName ?? null,
      beforeStatus: beforeSnapshot.status,
      afterStatus: afterSnapshot.status,
      beforeCurrentOwnerMemberId: beforeSnapshot.currentOwnerMemberId,
      afterCurrentOwnerMemberId: afterSnapshot.currentOwnerMemberId,
      createdAt: toTimestamp(row.createdAt),
    };
  }

  private parseTransferOperationSnapshot(
    snapshot: Prisma.JsonValue,
  ): TransferOperationSnapshot {
    const record =
      snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
        ? (snapshot as Record<string, unknown>)
        : {};

    return {
      status: typeof record.status === 'string' ? record.status : null,
      currentOwnerMemberId:
        typeof record.currentOwnerMemberId === 'string'
          ? record.currentOwnerMemberId
          : null,
      toMemberId:
        typeof record.toMemberId === 'string' ? record.toMemberId : null,
      expiredAt: typeof record.expiredAt === 'number' ? record.expiredAt : null,
      completedAt: typeof record.completedAt === 'number' ? record.completedAt : null,
    };
  }
}
