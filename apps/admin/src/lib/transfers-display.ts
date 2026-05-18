import { ApiError } from '@/lib/api-error'

export const TRANSFER_STATUS_FILTER_ALL = '__all__'
export const TRANSFER_MODE_FILTER_ALL = '__all__'

export const TRANSFER_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: TRANSFER_STATUS_FILTER_ALL, label: '全部状态' },
  { value: 'PENDING_ACCEPT', label: '待接收' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '已取消' },
  { value: 'EXPIRED', label: '已失效' },
]

export const TRANSFER_MODE_OPTIONS: { value: string; label: string }[] = [
  { value: TRANSFER_MODE_FILTER_ALL, label: '全部方式' },
  { value: 'DIRECT_MEMBER', label: '指定会员' },
  { value: 'TRANSFER_CODE', label: '转让码' },
]

const TRANSFER_STATUS_LABELS: Record<string, string> = {
  PENDING_ACCEPT: '待接收',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  EXPIRED: '已失效',
}

const TRANSFER_MODE_LABELS: Record<string, string> = {
  DIRECT_MEMBER: '指定会员',
  TRANSFER_CODE: '转让码',
}

export function formatTransferStatus(status: string): string {
  return TRANSFER_STATUS_LABELS[status] ?? status
}

export function formatTransferMode(mode: string): string {
  return TRANSFER_MODE_LABELS[mode] ?? mode
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
}): {
  page: string
  pageSize: string
  collectionNo?: string
  status?: string
  transferMode?: string
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
  }
}

export function mapListTransferOrdersErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'INVALID_COLLECTION_TRANSFER_STATUS':
        return '转让状态筛选无效，请改用列表中的筛选项。'
      case 'INVALID_COLLECTION_TRANSFER_MODE':
        return '转让方式筛选无效，请改用列表中的筛选项。'
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
