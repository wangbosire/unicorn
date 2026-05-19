import { ApiError } from '@/lib/api-error'

const CHANNEL_LABELS: Record<string, string> = {
  IN_APP: '站内信',
  MINIAPP_SUBSCRIPTION: '小程序订阅消息',
  WECHAT_MP: '公众号通知',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待发送',
  SENT: '发送成功',
  FAILED: '发送失败',
}

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  ACTIVATE_SUCCESS: '激活成功',
  CONTENT_APPROVED: '内容审核通过',
  CONTENT_REJECTED: '内容审核驳回',
  CONTENT_TAKEDOWN: '内容被人工下架',
  COMMENT_REVIEW_RESULT: '评论审核结果',
  TRANSFER_PENDING_ACCEPT: '转让待接收',
  TRANSFER_COMPLETED: '转让完成',
  TRANSFER_CANCELLED: '转让已撤销',
  TRANSFER_EXPIRED: '转让已过期',
  TRANSFER_ROLLED_BACK: '转让已回滚',
}

const TEMPLATE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: '启用',
  DISABLED: '停用',
}

export const NOTIFICATION_FAILURE_CODE_OPTIONS = [
  { value: 'OPENID_MISSING', label: '未绑定 OpenID' },
  { value: 'UPSTREAM_TIMEOUT', label: '上游超时' },
  { value: 'CHANNEL_STUB', label: '渠道桩实现' },
  { value: 'TEMPLATE_ERROR', label: '模板配置错误' },
  { value: 'RATE_LIMITED', label: '渠道限流' },
  { value: 'AUTH_FAILED', label: '渠道鉴权失败' },
  { value: 'CHANNEL_UNAVAILABLE', label: '渠道不可用' },
  { value: 'UNKNOWN_REASON', label: '未知原因' },
] as const

export type NotificationFailureCode =
  (typeof NOTIFICATION_FAILURE_CODE_OPTIONS)[number]['value']

export function formatNotificationChannels(channels: string[]): string {
  if (channels.length === 0) {
    return '—'
  }
  return channels.map((channel) => CHANNEL_LABELS[channel] ?? channel).join(' / ')
}

export function formatNotificationDispatchStatus(status: string | null): string {
  if (!status) {
    return '—'
  }
  return STATUS_LABELS[status] ?? status
}

export function formatNotificationMessageType(messageType: string): string {
  return MESSAGE_TYPE_LABELS[messageType] ?? messageType
}

export function formatNotificationTemplateStatus(status: string): string {
  return TEMPLATE_STATUS_LABELS[status] ?? status
}

export function formatNotificationTimestamp(ms: number | null): string {
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

export function mapNotificationsOverviewErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'ADMIN_AUTH_TOKEN_MISSING':
      case 'ADMIN_AUTH_TOKEN_INVALID':
        return '登录已失效或未携带后台令牌，请重新登录后再试。'
      case 'ADMIN_AUTH_FORBIDDEN':
        return '当前账号无「通知中心」权限，请联系管理员开通。'
      default:
        return error.message || '通知中心加载失败，请稍后重试。'
    }
  }
  return '通知中心加载失败，请检查网络后重试。'
}

export function mapNotificationTemplateMutationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'NOTIFICATION_TEMPLATE_NOT_FOUND':
        return '通知模板不存在，请刷新后重试。'
      case 'NOTIFICATION_TEMPLATE_KEY_IMMUTABLE':
        return '模板键不可修改，请确认正在编辑正确的模板。'
      case 'NOTIFICATION_TEMPLATE_ALREADY_EXISTS':
        return '该通知模板已存在，请勿重复创建。'
      case 'INVALID_NOTIFICATION_TEMPLATE_STATUS':
      case 'VALIDATION_ERROR':
        return '模板参数校验失败，请检查标题、正文和渠道配置。'
      case 'ADMIN_AUTH_TOKEN_MISSING':
      case 'ADMIN_AUTH_TOKEN_INVALID':
        return '登录已失效或未携带后台令牌，请重新登录后再试。'
      case 'ADMIN_AUTH_FORBIDDEN':
        return '当前账号无「通知中心」权限，请联系管理员开通。'
      default:
        return error.message || '通知模板操作失败，请稍后重试。'
    }
  }

  return '通知模板操作失败，请检查网络后重试。'
}

export function mapNotificationDispatchMutationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'NOTIFICATION_DISPATCH_RECORD_NOT_FOUND':
        return '派发记录不存在，请刷新列表后重试。'
      case 'NOTIFICATION_DISPATCH_RETRY_NOT_ALLOWED':
        return '只有失败的派发记录才允许重投。'
      case 'INVALID_NOTIFICATION_MESSAGE_TYPE':
      case 'INVALID_NOTIFICATION_CHANNEL':
      case 'INVALID_NOTIFICATION_DISPATCH_STATUS':
      case 'INVALID_NOTIFICATION_FAILURE_CODE':
      case 'VALIDATION_ERROR':
        return '派发记录查询参数无效，请调整筛选条件后重试。'
      case 'ADMIN_AUTH_TOKEN_MISSING':
      case 'ADMIN_AUTH_TOKEN_INVALID':
        return '登录已失效或未携带后台令牌，请重新登录后再试。'
      case 'ADMIN_AUTH_FORBIDDEN':
        return '当前账号无「通知中心」权限，请联系管理员开通。'
      default:
        return error.message || '派发记录操作失败，请稍后重试。'
    }
  }

  return '派发记录操作失败，请检查网络后重试。'
}
