import type { PaginatedData } from '../../common'

/**
 * 我的藏品列表项。
 */
export type MyCollectionListItem = {
  /** 藏品主键。 */
  id: string
  /** 对外展示的藏品编号。 */
  collectionNo: string
  /** 当前藏品资产状态。 */
  status: string
  /** 所属系列编号。 */
  seriesNo: string
  /** 所属系列名称。 */
  seriesName: string
  /** 最新内容版本主键；无版本时为 `null`。 */
  currentVersionId: string | null
  /** 最新内容版本号；无版本时为 `null`。 */
  currentVersionNo: number | null
  /** 最新内容标题；无版本时为 `null`。 */
  currentVersionTitle: string | null
  /** 展示封面图地址，没有内容时可为空。 */
  coverImageUrl: string | null
  /** 当前内容编辑状态。 */
  contentEditStatus: string
  /** 当前内容公开状态。 */
  contentPublishStatus: string
  /** 当前内容最新审核状态；无记录时为 `null`。 */
  contentReviewStatus: string | null
  /** 最新内容提交审核时间戳，单位毫秒；未提交时为 `null`。 */
  contentSubmittedAt: number | null
  /** 最新内容发布时间戳，单位毫秒；未发布时为 `null`。 */
  contentPublishedAt: number | null
  /** 实际领取时间戳，单位毫秒；未领取时为 null。 */
  claimedAt: number | null
}

/**
 * 查询我的藏品列表返回结构。
 */
export type ListMyCollectionsResponseData = PaginatedData<MyCollectionListItem>
