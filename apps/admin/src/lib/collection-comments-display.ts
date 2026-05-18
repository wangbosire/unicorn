import type {
  AdminCollectionCommentListItem,
  CollectionCommentReviewListItem,
} from '@contracts/admin/collection-comments'
import { ApiError } from '@/lib/api-error'

export const COMMENT_STATUS_FILTER_ALL = '__all__'

export const COMMENT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: COMMENT_STATUS_FILTER_ALL, label: '全部状态' },
  { value: 'PENDING_MACHINE', label: '机审待处理' },
  { value: 'MACHINE_APPROVED', label: '机审已通过' },
  { value: 'MACHINE_REJECTED', label: '机审已拒绝' },
  { value: 'PENDING_MANUAL', label: '待人工审核' },
  { value: 'MANUAL_APPROVED', label: '人工已通过' },
  { value: 'MANUAL_REJECTED', label: '人工已驳回' },
  { value: 'BLOCKED', label: '已屏蔽' },
]

const COMMENT_STATUS_LABELS: Record<string, string> = {
  PENDING_MACHINE: '机审待处理',
  MACHINE_APPROVED: '机审已通过',
  MACHINE_REJECTED: '机审已拒绝',
  PENDING_MANUAL: '待人工审核',
  MANUAL_APPROVED: '人工已通过',
  MANUAL_REJECTED: '人工已驳回',
  BLOCKED: '已屏蔽',
}

const REVIEW_SOURCE_LABELS: Record<string, string> = {
  SYSTEM: '系统',
  ADMIN: '管理员',
}

export function formatCollectionCommentStatus(status: string): string {
  return COMMENT_STATUS_LABELS[status] ?? status
}

export function formatCollectionCommentReviewSource(source: string | null): string {
  if (!source) {
    return '—'
  }
  return REVIEW_SOURCE_LABELS[source] ?? source
}

export function formatCommentTreeType(isRootComment: boolean): string {
  return isRootComment ? '一级评论' : '二级回复'
}

export function formatCommentTimestamp(ms: number | null): string {
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

export function rowMayApproveOrRejectCommentReview(
  row: CollectionCommentReviewListItem
): boolean {
  return row.status === 'PENDING_MANUAL'
}

export function rowMayBlockComment(
  row: Pick<AdminCollectionCommentListItem | CollectionCommentReviewListItem, 'status'>
): boolean {
  return row.status === 'MACHINE_APPROVED' || row.status === 'MANUAL_APPROVED'
}

export function buildCollectionCommentsQueryParams(params: {
  page: number
  pageSize: number
  status: string
  collectionNoFilter: string
}): {
  page: string
  pageSize: string
  status?: string
  collectionNo?: string
} {
  return {
    page: String(params.page),
    pageSize: String(params.pageSize),
    ...(params.status !== COMMENT_STATUS_FILTER_ALL ? { status: params.status } : {}),
    ...(params.collectionNoFilter.trim()
      ? { collectionNo: params.collectionNoFilter.trim() }
      : {}),
  }
}

export function buildCollectionCommentReviewsQueryParams(params: {
  page: number
  pageSize: number
  reviewStatus: string
  collectionNoFilter: string
}): {
  page: string
  pageSize: string
  reviewStatus?: string
  collectionNo?: string
} {
  return {
    page: String(params.page),
    pageSize: String(params.pageSize),
    ...(params.reviewStatus !== COMMENT_STATUS_FILTER_ALL
      ? { reviewStatus: params.reviewStatus }
      : {}),
    ...(params.collectionNoFilter.trim()
      ? { collectionNo: params.collectionNoFilter.trim() }
      : {}),
  }
}

export function mapListCollectionCommentsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'INVALID_COLLECTION_COMMENT_STATUS':
        return '评论状态筛选无效，请改用列表中的筛选项。'
      case 'ADMIN_AUTH_TOKEN_MISSING':
      case 'ADMIN_AUTH_TOKEN_INVALID':
        return '登录已失效或未携带后台令牌，请重新登录后再试。'
      case 'ADMIN_AUTH_FORBIDDEN':
        return '当前账号无「评论治理」权限，请联系管理员开通。'
      default:
        return error.message || '评论列表加载失败，请稍后重试。'
    }
  }
  return '评论列表加载失败，请检查网络后重试。'
}

export function mapListCollectionCommentReviewsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'INVALID_COLLECTION_COMMENT_STATUS':
        return '审核状态筛选无效，请改用列表中的筛选项。'
      case 'ADMIN_AUTH_TOKEN_MISSING':
      case 'ADMIN_AUTH_TOKEN_INVALID':
        return '登录已失效或未携带后台令牌，请重新登录后再试。'
      case 'ADMIN_AUTH_FORBIDDEN':
        return '当前账号无「评论治理」权限，请联系管理员开通。'
      default:
        return error.message || '评论审核列表加载失败，请稍后重试。'
    }
  }
  return '评论审核列表加载失败，请检查网络后重试。'
}

export function mapApproveCollectionCommentErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'COMMENT_NOT_FOUND':
      return '评论不存在或已删除，请刷新后重试。'
    case 'COMMENT_REVIEW_STATUS_INVALID':
      return '当前状态不允许人工通过（仅「待人工审核」可操作）。'
    case 'VALIDATION_ERROR':
      return error.message || '请求参数校验失败，请重试。'
    default:
      return error.message || '人工通过失败，请稍后重试。'
  }
}

export function mapRejectCollectionCommentErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'COMMENT_NOT_FOUND':
      return '评论不存在或已删除，请刷新后重试。'
    case 'COMMENT_REVIEW_STATUS_INVALID':
      return '当前状态不允许人工驳回（仅「待人工审核」可操作）。'
    case 'VALIDATION_ERROR':
      return error.message || '请填写驳回原因后重试。'
    default:
      return error.message || '人工驳回失败，请稍后重试。'
  }
}

export function mapBlockCollectionCommentErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'COMMENT_NOT_FOUND':
      return '评论不存在或已删除，请刷新后重试。'
    case 'COMMENT_BLOCK_STATUS_INVALID':
      return '当前状态不允许屏蔽（仅已通过审核的评论可操作）。'
    case 'VALIDATION_ERROR':
      return error.message || '请求参数校验失败，请重试。'
    default:
      return error.message || '屏蔽评论失败，请稍后重试。'
  }
}
