/**
 * 将公开评论发布时间格式化为便于阅读的短时间。
 */
export function formatCommentPublishedAt(value: string): string {
  const timestamp = Date.parse(value)

  if (Number.isNaN(timestamp)) {
    return value
  }

  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp)
  } catch {
    return value
  }
}

/**
 * 根据评论提交后的审核状态，生成小程序端提示文案。
 */
export function buildCommentSubmissionMessage(
  status: string,
  kind: 'comment' | 'reply'
): string {
  const noun = kind === 'reply' ? '回复' : '评论'

  switch (status) {
    case 'MACHINE_APPROVED':
    case 'MANUAL_APPROVED':
      return `${noun}已发布`
    case 'PENDING_MANUAL':
      return `${noun}已提交，待人工审核`
    case 'MACHINE_REJECTED':
    case 'MANUAL_REJECTED':
      return `${noun}未通过审核`
    default:
      return `${noun}已提交`
  }
}
