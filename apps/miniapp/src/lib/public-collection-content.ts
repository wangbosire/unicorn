/**
 * 从公开展示 `contentPayload` 中抽取段落文本（与编辑页写入的 `blocks[].type === 'paragraph'` 对齐）。
 */
export function extractParagraphTextsFromPayload(
  payload: Record<string, unknown> | undefined
): string[] {
  if (!payload) return []
  const blocks = payload.blocks
  if (!Array.isArray(blocks)) return []
  const out: string[] = []
  for (const item of blocks) {
    if (!item || typeof item !== 'object') continue
    const block = item as { type?: unknown; text?: unknown }
    if (block.type !== 'paragraph') continue
    if (typeof block.text !== 'string') continue
    const trimmed = block.text.trim()
    if (trimmed) out.push(trimmed)
  }
  return out
}

/**
 * 去掉与已展示标题、摘要完全相同的段落，避免编辑页写入的 blocks 与标题区重复展示。
 */
export function filterParagraphsDedupedAgainstTitleSummary(
  paragraphs: string[],
  title: string,
  summary: string
): string[] {
  const t = title.trim()
  const s = summary.trim()
  return paragraphs.filter((line) => line !== t && line !== s)
}
