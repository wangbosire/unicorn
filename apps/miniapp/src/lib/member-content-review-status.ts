/**
 * 将会员端内容审核状态枚举转为可读中文（与 `CollectionContentReviewStatus` 对齐）。
 */
export function formatMemberContentReviewStatus(status: string | null | undefined): string {
  if (status == null || status === '') {
    return '—'
  }
  const labels: Record<string, string> = {
    PENDING_MACHINE: '机审处理中',
    MACHINE_APPROVED: '机审已通过',
    MACHINE_REJECTED: '机审未通过',
    PENDING_MANUAL: '待人工复核',
    MANUAL_APPROVED: '人工已通过',
    MANUAL_REJECTED: '人工未通过',
  }
  return labels[status] ?? status
}
