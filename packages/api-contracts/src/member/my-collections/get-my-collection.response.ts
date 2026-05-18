/**
 * 我的藏品详情中的系列摘要。
 */
export type MyCollectionSeriesSummary = {
  /** 系列主键。 */
  id: string
  /** 对外展示的系列编号。 */
  seriesNo: string
  /** 系列名称。 */
  name: string
  /** 系列描述。 */
  description: string
}

/**
 * 我的藏品详情中的内容版本摘要。
 */
export type MyCollectionContentSummary = {
  /** 内容版本主键。 */
  id: string
  /** 单藏品内递增版本号。 */
  versionNo: number
  /** 展示标题。 */
  title: string
  /** 展示摘要。 */
  summary: string
  /** 封面图地址。 */
  coverImageUrl: string | null
  /** 当前编辑状态。 */
  editStatus: string
  /** 当前公开状态。 */
  publishStatus: string
  /** 最新审核状态；无记录时为 `null`。 */
  contentReviewStatus: string | null
  /** 最新审核原因；无记录或无原因时为 `null`。 */
  contentReviewReason: string | null
  /** 提交审核时间戳，单位毫秒；未提交时为 `null`。 */
  submittedAt: number | null
  /** 发布时间戳，单位毫秒；未发布时为 `null`。 */
  publishedAt: number | null
  /** 最新更新时间戳，单位毫秒。 */
  updatedAt: number
}

/**
 * 查询我的藏品详情返回结构。
 */
export type GetMyCollectionResponseData = {
  /** 藏品主键。 */
  id: string
  /** 对外展示的藏品编号。 */
  collectionNo: string
  /** 当前藏品资产状态。 */
  status: string
  /** 所属系列摘要。 */
  series: MyCollectionSeriesSummary
  /** 最新内容版本摘要；无版本时为 `null`。 */
  currentVersion: MyCollectionContentSummary | null
  /** 实际领取时间戳，单位毫秒；未领取时为 `null`。 */
  claimedAt: number | null
}
