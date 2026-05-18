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
