import { ApiError } from '@/lib/api-error'

export const TRANSFER_STATUS_FILTER_ALL = '__all__'
export const TRANSFER_MODE_FILTER_ALL = '__all__'
export const TRANSFER_ANOMALY_FILTER_ALL = '__all__'
export const TRANSFER_OPERATION_TYPE_FILTER_ALL = '__all__'

export const TRANSFER_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: TRANSFER_STATUS_FILTER_ALL, label: '全部状态' },
  { value: 'PENDING_ACCEPT', label: '待接收' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '已取消' },
  { value: 'EXPIRED', label: '已失效' },
  { value: 'ROLLED_BACK', label: '已回滚' },
]

export const TRANSFER_MODE_OPTIONS: { value: string; label: string }[] = [
  { value: TRANSFER_MODE_FILTER_ALL, label: '全部方式' },
  { value: 'DIRECT_MEMBER', label: '指定会员' },
  { value: 'TRANSFER_CODE', label: '转让码' },
]

export const TRANSFER_ANOMALY_OPTIONS: { value: string; label: string }[] = [
  { value: TRANSFER_ANOMALY_FILTER_ALL, label: '全部异常态' },
  { value: 'EXPIRED_PENDING_RELEASE', label: '超时未释放' },
  { value: 'PENDING_ACCEPT_OWNER_ALREADY_TRANSFERRED', label: '待接收但归属已到账' },
  { value: 'COMPLETED_OWNER_MISMATCH', label: '已完成但归属未对齐' },
]

export const TRANSFER_OPERATION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: TRANSFER_OPERATION_TYPE_FILTER_ALL, label: '全部动作' },
  { value: 'ADMIN_EXPIRE', label: '释放超时单' },
  { value: 'ADMIN_FORCE_COMPLETE', label: '强制完成' },
  { value: 'ADMIN_FORCE_ROLLBACK', label: '强制回滚' },
  { value: 'ADMIN_SYNC_OWNER', label: '修复归属' },
]

const TRANSFER_STATUS_LABELS: Record<string, string> = {
  PENDING_ACCEPT: '待接收',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  EXPIRED: '已失效',
  ROLLED_BACK: '已回滚',
}

const TRANSFER_MODE_LABELS: Record<string, string> = {
  DIRECT_MEMBER: '指定会员',
  TRANSFER_CODE: '转让码',
}

const TRANSFER_ANOMALY_LABELS: Record<string, string> = {
  EXPIRED_PENDING_RELEASE: '超时未释放',
  PENDING_ACCEPT_OWNER_ALREADY_TRANSFERRED: '待接收但归属已到账',
  COMPLETED_OWNER_MISMATCH: '已完成但归属未对齐',
}

const TRANSFER_OPERATION_ACTION_LABELS: Record<string, string> = {
  ADMIN_EXPIRE: '释放超时单',
  ADMIN_SYNC_OWNER: '修复归属',
  ADMIN_FORCE_COMPLETE: '强制完成',
  ADMIN_FORCE_ROLLBACK: '强制回滚',
}

export function formatTransferStatus(status: string): string {
  return TRANSFER_STATUS_LABELS[status] ?? status
}

export function formatTransferMode(mode: string): string {
  return TRANSFER_MODE_LABELS[mode] ?? mode
}

export function formatTransferAnomaly(anomalyCode: string | null): string {
  if (!anomalyCode) {
    return '—'
  }
  return TRANSFER_ANOMALY_LABELS[anomalyCode] ?? anomalyCode
}

export function formatTransferOperationAction(actionType: string): string {
  return TRANSFER_OPERATION_ACTION_LABELS[actionType] ?? actionType
}

export function formatTransferReceiver(params: {
  toMemberNo: string | null
  toMemberNickname: string | null
  transferMode: string
}): string {
  if (params.toMemberNo && params.toMemberNickname) {
    return `${params.toMemberNickname} (${params.toMemberNo})`
  }
  if (params.transferMode === 'TRANSFER_CODE') {
    return '待转让码接收'
  }
  return '—'
}

export function formatTransferTimestamp(ms: number | null): string {
  if (ms == null) {
    return '—'
  }
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(ms)
  } catch {
    return String(ms)
  }
}

export function buildTransferOrdersQueryParams(params: {
  page: number
  pageSize: number
  collectionNoFilter: string
  status: string
  transferMode: string
  anomalyCode?: string
}): {
  page: string
  pageSize: string
  collectionNo?: string
  status?: string
  transferMode?: string
  anomalyCode?: string
} {
  return {
    page: String(params.page),
    pageSize: String(params.pageSize),
    ...(params.collectionNoFilter.trim()
      ? { collectionNo: params.collectionNoFilter.trim() }
      : {}),
    ...(params.status !== TRANSFER_STATUS_FILTER_ALL ? { status: params.status } : {}),
    ...(params.transferMode !== TRANSFER_MODE_FILTER_ALL
      ? { transferMode: params.transferMode }
      : {}),
    ...(params.anomalyCode &&
    params.anomalyCode !== TRANSFER_ANOMALY_FILTER_ALL
      ? { anomalyCode: params.anomalyCode }
      : {}),
  }
}

export function buildTransferOperationRecordsQueryParams(params: {
  page: number
  pageSize: number
  collectionNoFilter: string
  transferNoFilter: string
  operatorAdminAccountNoFilter: string
  actionType: string
}): {
  page: string
  pageSize: string
  collectionNo?: string
  transferNo?: string
  operatorAdminAccountNo?: string
  actionType?: string
} {
  return {
    page: String(params.page),
    pageSize: String(params.pageSize),
    ...(params.collectionNoFilter.trim()
      ? { collectionNo: params.collectionNoFilter.trim() }
      : {}),
    ...(params.transferNoFilter.trim() ? { transferNo: params.transferNoFilter.trim() } : {}),
    ...(params.operatorAdminAccountNoFilter.trim()
      ? { operatorAdminAccountNo: params.operatorAdminAccountNoFilter.trim() }
      : {}),
    ...(params.actionType !== TRANSFER_OPERATION_TYPE_FILTER_ALL
      ? { actionType: params.actionType }
      : {}),
  }
}

export function mapListTransferOrdersErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'INVALID_COLLECTION_TRANSFER_STATUS':
        return '转让状态筛选无效，请改用列表中的筛选项。'
      case 'INVALID_COLLECTION_TRANSFER_MODE':
        return '转让方式筛选无效，请改用列表中的筛选项。'
      case 'INVALID_TRANSFER_ANOMALY_CODE':
        return '异常态筛选无效，请改用列表中的筛选项。'
      case 'INVALID_TRANSFER_OPERATION_TYPE':
        return '处置动作筛选无效，请改用列表中的筛选项。'
      case 'TRANSFER_EXPIRE_NOT_ALLOWED':
        return '只有超时未释放的待接收转让才允许后台释放。'
      case 'TRANSFER_COMPLETE_NOT_ALLOWED':
        return '只有待接收但归属已到账的转让才允许后台强制完成。'
      case 'TRANSFER_ROLLBACK_NOT_ALLOWED':
        return '只有已完成的转让才允许后台强制回滚。'
      case 'TRANSFER_OWNER_SYNC_NOT_ALLOWED':
        return '只有已完成但归属未对齐的转让才允许修复归属。'
      case 'TRANSFER_NOT_FOUND':
        return '转让单不存在，请刷新列表后重试。'
      case 'ADMIN_AUTH_TOKEN_MISSING':
      case 'ADMIN_AUTH_TOKEN_INVALID':
        return '登录已失效或未携带后台令牌，请重新登录后再试。'
      case 'ADMIN_AUTH_FORBIDDEN':
        return '当前账号无「转让记录」权限，请联系管理员开通。'
      default:
        return error.message || '转让记录加载失败，请稍后重试。'
    }
  }
  return '转让记录加载失败，请检查网络后重试。'
}

export function mapTransferOperationRecordsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'INVALID_TRANSFER_OPERATION_TYPE':
        return '处置动作筛选无效，请改用列表中的筛选项。'
      case 'ADMIN_AUTH_TOKEN_MISSING':
      case 'ADMIN_AUTH_TOKEN_INVALID':
        return '登录已失效或未携带后台令牌，请重新登录后再试。'
      case 'ADMIN_AUTH_FORBIDDEN':
        return '当前账号无「转让记录」权限，请联系管理员开通。'
      default:
        return error.message || '运营处置记录加载失败，请稍后重试。'
    }
  }
  return '运营处置记录加载失败，请检查网络后重试。'
}

export function mapTransferOrderHistoryErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'TRANSFER_NOT_FOUND':
        return '转让单不存在，请刷新列表后重试。'
      case 'TRANSFER_HISTORY_LIMIT_EXCEEDED':
        return '该转让单留痕过多，请联系研发协助排查。'
      case 'ADMIN_AUTH_TOKEN_MISSING':
      case 'ADMIN_AUTH_TOKEN_INVALID':
        return '登录已失效或未携带后台令牌，请重新登录后再试。'
      case 'ADMIN_AUTH_FORBIDDEN':
        return '当前账号无「转让记录」权限，请联系管理员开通。'
      default:
        return error.message || '运营留痕加载失败，请稍后重试。'
    }
  }
  return '运营留痕加载失败，请检查网络后重试。'
}
