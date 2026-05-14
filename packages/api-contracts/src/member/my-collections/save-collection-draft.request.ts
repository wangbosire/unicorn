/**
 * 保存藏品内容草稿请求。
 */
export type SaveCollectionDraftRequest = {
  /** 展示标题。 */
  title: string
  /** 展示摘要。 */
  summary: string
  /** 封面图地址。 */
  coverImageUrl: string | null
  /** 结构化内容载荷，一期约定以前后端共享 JSON 结构承载。 */
  contentPayload: Record<string, unknown>
}
