import type { AdminTransferOperationRecordListItem } from '@contracts/admin/transfers'
import {
  formatTransferOperationAction,
  formatTransferStatus,
} from '@/lib/transfers-display'

/**
 * CSV 单元格转义（RFC 4180 风格）：含逗号、引号或换行时用双引号包裹，内部 `"` 写成 `""`。
 */
function escapeCsvField(raw: string): string {
  const needsQuote = /[",\r\n]/.test(raw)
  const escaped = raw.replace(/"/g, '""')
  return needsQuote ? `"${escaped}"` : escaped
}

/**
 * 序列化运营处置记录当前页数据，便于客服复盘和客诉补偿留档。
 */
export function buildTransferOperationRecordsCsv(
  items: AdminTransferOperationRecordListItem[]
): string {
  const header = [
    '处置记录ID',
    '转让单ID',
    '转让单号',
    '藏品ID',
    '藏品编号',
    '处置动作',
    '处置动作编码',
    '处置前状态',
    '处置后状态',
    '处置前持有人ID',
    '处置后持有人ID',
    '操作人账号',
    '操作人名称',
    '处置原因',
    '记录创建时间_ISO8601',
  ]

  const lines = [
    header.map(escapeCsvField).join(','),
    ...items.map((row) =>
      [
        row.operationRecordId,
        row.transferId,
        row.transferNo,
        row.collectionId,
        row.collectionNo,
        formatTransferOperationAction(row.actionType),
        row.actionType,
        row.beforeStatus ? formatTransferStatus(row.beforeStatus) : '',
        row.afterStatus ? formatTransferStatus(row.afterStatus) : '',
        row.beforeCurrentOwnerMemberId ?? '',
        row.afterCurrentOwnerMemberId ?? '',
        row.operatorAdminAccountNo ?? '',
        row.operatorAdminDisplayName ?? '',
        row.reason,
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
