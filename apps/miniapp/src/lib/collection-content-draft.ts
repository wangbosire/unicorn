/** 从内容载荷 JSON 中读取字符串字段（与编辑页写入的 key 对齐）。 */
export function readTextFromPayload(
  payload: Record<string, unknown> | undefined,
  key: string
): string {
  const value = payload?.[key]
  return typeof value === 'string' ? value : ''
}

/** 组装保存草稿用的 `contentPayload`（与 `collection-edit` 写入结构一致）。 */
export function buildContentPayload(
  title: string,
  summary: string,
  coverUrl: string
): Record<string, unknown> {
  return {
    title: title.trim(),
    summary: summary.trim(),
    coverImageUrl: coverUrl.trim() || undefined,
    blocks: [
      { type: 'paragraph', text: title.trim() },
      { type: 'paragraph', text: summary.trim() },
    ],
  }
}
