/**
 * 通知失败归一化编码到运营标签的映射。
 * 保持稳定，便于后台筛选和聚合口径一致。
 */
export const NORMALIZED_FAILURE_LABELS = {
  OPENID_MISSING: '未绑定 OpenID',
  UPSTREAM_TIMEOUT: '上游超时',
  CHANNEL_STUB: '渠道桩实现',
  TEMPLATE_ERROR: '模板配置错误',
  RATE_LIMITED: '渠道限流',
  AUTH_FAILED: '渠道鉴权失败',
  CHANNEL_UNAVAILABLE: '渠道不可用',
  UNKNOWN_REASON: '未知原因',
} as const;

export type NotificationFailureCode = keyof typeof NORMALIZED_FAILURE_LABELS;
export const NOTIFICATION_FAILURE_CODES = Object.keys(
  NORMALIZED_FAILURE_LABELS,
) as NotificationFailureCode[];

export type NormalizedNotificationFailure = {
  code: NotificationFailureCode;
  label: string;
};

/**
 * 将渠道原始错误归一化为稳定的运营标签。
 */
export function normalizeNotificationFailure(
  providerResponse: string | null,
): NormalizedNotificationFailure {
  const normalized = providerResponse?.trim().toLowerCase() ?? '';

  if (
    normalized.includes('openid missing') ||
    normalized.includes('openid not bound') ||
    normalized.includes('openid unbound')
  ) {
    return {
      code: 'OPENID_MISSING',
      label: NORMALIZED_FAILURE_LABELS.OPENID_MISSING,
    };
  }

  if (normalized.includes('timeout') || normalized.includes('timed out')) {
    return {
      code: 'UPSTREAM_TIMEOUT',
      label: NORMALIZED_FAILURE_LABELS.UPSTREAM_TIMEOUT,
    };
  }

  if (normalized.startsWith('stub:')) {
    return {
      code: 'CHANNEL_STUB',
      label: NORMALIZED_FAILURE_LABELS.CHANNEL_STUB,
    };
  }

  if (
    normalized.includes('template invalid') ||
    normalized.includes('invalid template') ||
    normalized.includes('template param') ||
    normalized.includes('template parameter')
  ) {
    return {
      code: 'TEMPLATE_ERROR',
      label: NORMALIZED_FAILURE_LABELS.TEMPLATE_ERROR,
    };
  }

  if (
    normalized.includes('rate limit') ||
    normalized.includes('too many requests') ||
    normalized.includes('quota exceeded')
  ) {
    return {
      code: 'RATE_LIMITED',
      label: NORMALIZED_FAILURE_LABELS.RATE_LIMITED,
    };
  }

  if (
    normalized.includes('unauthorized') ||
    normalized.includes('invalid credential') ||
    normalized.includes('access token') ||
    normalized.includes('signature')
  ) {
    return {
      code: 'AUTH_FAILED',
      label: NORMALIZED_FAILURE_LABELS.AUTH_FAILED,
    };
  }

  if (
    normalized.includes('connection refused') ||
    normalized.includes('service unavailable') ||
    normalized.includes('upstream unavailable')
  ) {
    return {
      code: 'CHANNEL_UNAVAILABLE',
      label: NORMALIZED_FAILURE_LABELS.CHANNEL_UNAVAILABLE,
    };
  }

  return {
    code: 'UNKNOWN_REASON',
    label: NORMALIZED_FAILURE_LABELS.UNKNOWN_REASON,
  };
}
