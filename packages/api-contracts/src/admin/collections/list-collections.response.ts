import type { PaginatedData } from '../../common'

/**
 * 藏品列表项。
 */
export type CollectionListItem = {
  /** 藏品主键。 */
  id: string
  /** 对外展示的藏品编号。 */
  collectionNo: string
  /** 所属系列名称。 */
  seriesName: string
  /** 所属批次名称。 */
  batchName: string
  /** 当前藏品资产状态。 */
  status: string
  /** 当前拥有者会员主键，未领取时为空。 */
  currentOwnerMemberId: string | null
  /** 实际领取时间。 */
  claimedAt: string | null
}

/**
 * 查询藏品列表返回结构。
 */
export type ListCollectionsResponseData = PaginatedData<CollectionListItem>
