import type { CollectionReviewListItem } from '@contracts/admin/collection-reviews'
import { ApiError } from '@/lib/api-error'

export const REVIEW_STATUS_FILTER_ALL = '__all__'

/** 审核状态筛选项（值与后端枚举一致）。 */
export const REVIEW_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: REVIEW_STATUS_FILTER_ALL, label: '全部状态' },
  { value: 'PENDING_MACHINE', label: '机审待处理' },
  { value: 'MACHINE_APPROVED', label: '机审已通过' },
  { value: 'MACHINE_REJECTED', label: '机审已拒绝' },
  { value: 'PENDING_MANUAL', label: '待人工复核' },
  { value: 'MANUAL_APPROVED', label: '人工已通过' },
  { value: 'MANUAL_REJECTED', label: '人工已拒绝' },
]

const REVIEW_STATUS_LABELS: Record<string, string> = {
  PENDING_MACHINE: '机审待处理',
  MACHINE_APPROVED: '机审已通过',
  MACHINE_REJECTED: '机审已拒绝',
  PENDING_MANUAL: '待人工复核',
  MANUAL_APPROVED: '人工已通过',
  MANUAL_REJECTED: '人工已拒绝',
}

const REVIEW_STAGE_LABELS: Record<string, string> = {
  MACHINE: '机审',
  MANUAL: '人工',
}

/** 审核来源中文（与 `CollectionContentReviewSource` 对齐）。 */
const REVIEW_SOURCE_LABELS: Record<string, string> = {
  SYSTEM: '系统',
  ADMIN: '管理员',
}

/** 审核记录为「机审/人工已通过」时，允许尝试下架对应内容版本的公开展示。 */
export function rowMayTakedownPublish(row: CollectionReviewListItem): boolean {
  return (
    row.reviewStatus === 'MACHINE_APPROVED' || row.reviewStatus === 'MANUAL_APPROVED'
  )
}

export function formatReviewSource(source: string): string {
  return REVIEW_SOURCE_LABELS[source] ?? source
}

export function formatReviewStatus(status: string): string {
  return REVIEW_STATUS_LABELS[status] ?? status
}

export function formatReviewStage(stage: string): string {
  return REVIEW_STAGE_LABELS[stage] ?? stage
}

export function formatSubmittedAt(ms: number): string {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(ms)
  } catch {
    return String(ms)
  }
}

export function buildCollectionReviewsQueryParams(params: {
  page: number
  pageSize: number
  reviewStatus: string
  collectionNoFilter: string
}): {
  page: number
  pageSize: number
  reviewStatus?: string
  collectionNo?: string
} {
  return {
    page: params.page,
    pageSize: params.pageSize,
    ...(params.reviewStatus !== REVIEW_STATUS_FILTER_ALL
      ? { reviewStatus: params.reviewStatus }
      : {}),
    ...(params.collectionNoFilter.trim()
      ? { collectionNo: params.collectionNoFilter.trim() }
      : {}),
  }
}

export function mapApproveReviewErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'REVIEW_RECORD_NOT_FOUND':
      return '审核记录不存在或已删除'
    case 'REVIEW_STATUS_INVALID':
      return '当前状态不允许人工通过（仅「待人工复核」可操作）'
    case 'VALIDATION_ERROR':
      return error.message
    default:
      return error.message || '人工通过失败，请稍后重试'
  }
}

export function mapRejectReviewErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'REVIEW_RECORD_NOT_FOUND':
      return '审核记录不存在或已删除'
    case 'REVIEW_STATUS_INVALID':
      return '当前状态不允许人工驳回（仅「待人工复核」可操作）'
    case 'VALIDATION_ERROR':
      return error.message
    default:
      return error.message || '人工驳回失败，请稍后重试'
  }
}

export function mapTakedownPublishErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'CONTENT_VERSION_NOT_FOUND':
      return '内容版本不存在或已删除'
    case 'TAKEDOWN_STATUS_INVALID':
      return error.message.includes('already taken down')
        ? '该版本已处于下架状态'
        : '当前版本不允许下架（需为已通过且公开发布态）'
    case 'VALIDATION_ERROR':
      return error.message
    default:
      return error.message || '下架失败，请稍后重试'
  }
}

/** 列表加载失败时的可读说明（含鉴权与筛选参数错误）。 */
export function mapListCollectionReviewsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'INVALID_COLLECTION_REVIEW_STATUS':
        return '审核状态筛选无效，请改用列表中的筛选项。'
      case 'ADMIN_AUTH_TOKEN_MISSING':
      case 'ADMIN_AUTH_TOKEN_INVALID':
        return '登录已失效或未携带后台令牌，请重新登录后再试。'
      case 'ADMIN_AUTH_FORBIDDEN':
        return '当前账号无「内容复核」权限，请联系管理员开通。'
      default:
        return error.message || '审核记录加载失败，请稍后重试。'
    }
  }
  return '审核记录加载失败，请检查网络后重试。'
}

export function mapCollectionReviewHistoryErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return error.message || '请求参数无效。'
      case 'COLLECTION_NOT_FOUND':
        return '未找到该藏品编号，请核对后重试。'
      case 'CONTENT_VERSION_NOT_FOUND':
        return '该内容版本不属于此藏品或不存在。'
      case 'REVIEW_HISTORY_LIMIT_EXCEEDED':
        return '审核记录过多，请缩小筛选范围后重试。'
      case 'ADMIN_AUTH_TOKEN_MISSING':
      case 'ADMIN_AUTH_TOKEN_INVALID':
        return '登录已失效或未携带后台令牌，请重新登录后再试。'
      case 'ADMIN_AUTH_FORBIDDEN':
        return '当前账号无「内容复核」权限，请联系管理员开通。'
      default:
        return error.message || '审核历史加载失败，请稍后重试。'
    }
  }
  return '审核历史加载失败，请检查网络后重试。'
}
