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
  /** 所属系列名称。 */
  seriesName: string
  /** 展示封面图地址，没有内容时可为空。 */
  coverImageUrl: string | null
  /** 当前内容公开状态。 */
  contentPublishStatus: string
  /** 实际领取时间戳，单位毫秒；未领取时为 null。 */
  claimedAt: number | null
}

/**
 * 查询我的藏品列表返回结构。
 */
export type ListMyCollectionsResponseData = PaginatedData<MyCollectionListItem>
