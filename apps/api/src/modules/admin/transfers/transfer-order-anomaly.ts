import { CollectionTransferStatus } from '@prisma/client';

export const TRANSFER_ORDER_ANOMALY_LABELS = {
  EXPIRED_PENDING_RELEASE: '超时未释放',
  COMPLETED_OWNER_MISMATCH: '已完成但归属未对齐',
  PENDING_ACCEPT_OWNER_ALREADY_TRANSFERRED: '待接收但归属已到账',
} as const;

export type TransferOrderAnomalyCode = keyof typeof TRANSFER_ORDER_ANOMALY_LABELS;
export const TRANSFER_ORDER_ANOMALY_CODES = Object.keys(
  TRANSFER_ORDER_ANOMALY_LABELS,
) as TransferOrderAnomalyCode[];

export type TransferOrderAnomaly = {
  code: TransferOrderAnomalyCode;
  label: string;
};

/**
 * 识别需要运营介入的转让异常态。
 * 当前聚焦二期计划中的两类高频客诉：超时未释放、已完成但归属未对齐。
 */
export function detectTransferOrderAnomaly(input: {
  status: CollectionTransferStatus;
  expiredAt: Date | null;
  completedAt: Date | null;
  toMemberId: string | null;
  currentOwnerMemberId: string | null;
  now?: Date;
}): TransferOrderAnomaly | null {
  const now = input.now ?? new Date();

  if (
    input.status === CollectionTransferStatus.PENDING_ACCEPT &&
    input.expiredAt &&
    input.expiredAt.getTime() <= now.getTime()
  ) {
    return {
      code: 'EXPIRED_PENDING_RELEASE',
      label: TRANSFER_ORDER_ANOMALY_LABELS.EXPIRED_PENDING_RELEASE,
    };
  }

  if (
    input.status === CollectionTransferStatus.PENDING_ACCEPT &&
    !!input.toMemberId &&
    input.currentOwnerMemberId === input.toMemberId
  ) {
    return {
      code: 'PENDING_ACCEPT_OWNER_ALREADY_TRANSFERRED',
      label: TRANSFER_ORDER_ANOMALY_LABELS.PENDING_ACCEPT_OWNER_ALREADY_TRANSFERRED,
    };
  }

  if (
    input.status === CollectionTransferStatus.COMPLETED &&
    (!input.toMemberId || input.currentOwnerMemberId !== input.toMemberId)
  ) {
    return {
      code: 'COMPLETED_OWNER_MISMATCH',
      label: TRANSFER_ORDER_ANOMALY_LABELS.COMPLETED_OWNER_MISMATCH,
    };
  }

  return null;
}
