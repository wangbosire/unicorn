/**
 * 藏品当前内容版本视图。
 * 该结构用于前后端共享当前可编辑版本的标准返回形态。
 */
export type CollectionContentVersionView = {
  /** 内容版本主键。 */
  id: string
  /** 单藏品内递增的版本号。 */
  versionNo: number
  /** 展示标题。 */
  title: string
  /** 展示摘要。 */
  summary: string
  /** 展示封面图片地址。 */
  coverImageUrl: string | null
  /** 结构化内容载荷，一期按前后端共享 JSON 结构承载。 */
  contentPayload: Record<string, unknown>
  /** 当前编辑状态。 */
  editStatus: string
  /** 当前公开发布状态。 */
  publishStatus: string
  /**
   * 与该内容版本关联的最新一条审核记录状态（按创建时间倒序取一条）；
   * 无记录时为 `null`，用于 C 端展示「待人工复核」等口径。
   */
  contentReviewStatus: string | null
}

/**
 * 获取藏品内容返回结构。
 */
export type GetCollectionContentResponseData = {
  /** 藏品主键。 */
  collectionId: string
  /** 当前可编辑版本。 */
  currentVersion: CollectionContentVersionView
}
