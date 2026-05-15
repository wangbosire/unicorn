import type { CollectionReviewListItem } from '@contracts/admin/collection-reviews'

/**
 * CSV 单元格转义（RFC 4180 风格）：含逗号、引号或换行时用双引号包裹，内部 `"` 写成 `""`。
 */
export function escapeCsvField(raw: string): string {
  const needsQuote = /[",\r\n]/.test(raw)
  const escaped = raw.replace(/"/g, '""')
  return needsQuote ? `"${escaped}"` : escaped
}

/**
 * 将当前页的审核列表行序列化为 CSV 文本（含表头，不含 BOM；由调用方自行加 `\uFEFF`）。
 */
export function buildCollectionReviewsCsv(items: CollectionReviewListItem[]): string {
  const header = [
    '审核记录ID',
    '藏品ID',
    '藏品编号',
    '内容版本ID',
    '版本号',
    '审核阶段',
    '审核状态',
    '说明',
    '提交时间_ISO8601',
  ]

  const lines = [
    header.map(escapeCsvField).join(','),
    ...items.map((row) =>
      [
        row.reviewId,
        row.collectionId,
        row.collectionNo,
        row.contentVersionId,
        String(row.versionNo),
        row.reviewStage,
        row.reviewStatus,
        row.reviewReason ?? '',
        new Date(row.submittedAt).toISOString(),
      ]
        .map((cell) => escapeCsvField(cell))
        .join(','),
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
