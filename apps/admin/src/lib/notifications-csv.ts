import type {
  AdminNotificationDispatchRecordListItem,
  AdminNotificationFailureSummaryItem,
} from '@contracts/admin/notifications'

/**
 * CSV 单元格转义（RFC 4180 风格）：含逗号、引号或换行时用双引号包裹，内部 `"` 写成 `""`。
 */
function escapeCsvField(raw: string): string {
  const needsQuote = /[",\r\n]/.test(raw)
  const escaped = raw.replace(/"/g, '""')
  return needsQuote ? `"${escaped}"` : escaped
}

/**
 * 序列化失败聚合当前页数据，便于运营离线分发和汇总。
 */
export function buildNotificationFailureSummaryCsv(
  items: AdminNotificationFailureSummaryItem[]
): string {
  const header = [
    '事件类型',
    '事件名称',
    '派发渠道',
    '失败编码',
    '失败标签',
    '失败次数',
    '影响消息数',
    '最近失败时间_ISO8601',
    '最近失败派发记录ID',
    '原始失败样例',
  ]

  const lines = [
    header.map(escapeCsvField).join(','),
    ...items.map((row) =>
      [
        row.messageType,
        row.eventLabel,
        row.channel,
        row.failureCode,
        row.failureReason,
        String(row.failedCount),
        String(row.affectedMessages),
        new Date(row.latestFailedAt).toISOString(),
        row.latestDispatchRecordId,
        row.sampleReason ?? '',
      ]
        .map((cell) => escapeCsvField(cell))
        .join(',')
    ),
  ]

  return lines.join('\r\n')
}

/**
 * 序列化派发记录当前页数据，保留归一化标签与原始渠道响应，便于排障追踪。
 */
export function buildNotificationDispatchRecordsCsv(
  items: AdminNotificationDispatchRecordListItem[]
): string {
  const header = [
    '派发记录ID',
    '消息ID',
    '会员ID',
    '事件类型',
    '事件名称',
    '派发渠道',
    '派发状态',
    '失败编码',
    '失败标签',
    '消息标题',
    '消息正文',
    '渠道响应',
    '发送时间_ISO8601',
    '记录创建时间_ISO8601',
  ]

  const lines = [
    header.map(escapeCsvField).join(','),
    ...items.map((row) =>
      [
        row.dispatchRecordId,
        row.messageId,
        row.memberId,
        row.messageType,
        row.eventLabel,
        row.channel,
        row.status,
        row.failureCode ?? '',
        row.failureReason ?? '',
        row.title,
        row.content,
        row.providerResponse ?? '',
        row.sentAt != null ? new Date(row.sentAt).toISOString() : '',
        new Date(row.createdAt).toISOString(),
      ]
        .map((cell) => escapeCsvField(cell))
        .join(',')
    ),
  ]

  return lines.join('\r\n')
}

/**
 * 触发浏览器下载 UTF-8 CSV（带 BOM，便于 Excel 识别中文）。
 */
export function downloadUtf8Csv(filename: string, csvBody: string): void {
  const blob = new Blob([`\uFEFF${csvBody}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.click()
  URL.revokeObjectURL(url)
}
