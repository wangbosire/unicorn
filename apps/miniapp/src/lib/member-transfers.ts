/**
 * 转让状态展示文案。
 */
export function formatMemberTransferStatus(status: string): string {
  switch (status) {
    case 'PENDING_ACCEPT':
      return '待接收'
    case 'COMPLETED':
      return '已完成'
    case 'CANCELLED':
      return '已取消'
    case 'EXPIRED':
      return '已过期'
    default:
      return status
  }
}

/**
 * 转让方式展示文案。
 */
export function formatMemberTransferMode(mode: string): string {
  switch (mode) {
    case 'DIRECT_MEMBER':
      return '指定会员转让'
    case 'TRANSFER_CODE':
      return '转让码转让'
    default:
      return mode
  }
}

/**
 * 转让时间展示。
 */
export function formatMemberTransferTimestamp(value: number | null): string {
  if (!value) {
    return '—'
  }

  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(value)
  } catch {
    return String(value)
  }
}
