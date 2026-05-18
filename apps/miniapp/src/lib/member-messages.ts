/**
 * 格式化会员消息创建时间。
 */
export function formatMemberMessageTimestamp(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp)
  } catch {
    return String(timestamp)
  }
}

/**
 * 格式化会员消息类型标签。
 */
export function formatMemberMessageType(messageType: string): string {
  switch (messageType) {
    case 'ACTIVATE_SUCCESS':
      return '激活成功'
    case 'CONTENT_APPROVED':
      return '内容审核通过'
    case 'CONTENT_REJECTED':
      return '内容审核驳回'
    case 'CONTENT_TAKEDOWN':
      return '内容被人工下架'
    case 'COMMENT_REVIEW_RESULT':
      return '评论审核结果'
    case 'TRANSFER_PENDING_ACCEPT':
      return '转让待接收'
    case 'TRANSFER_COMPLETED':
      return '转让完成'
    default:
      return messageType
  }
}
