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
  /** 当前拥有者会员编号，未领取时为空。 */
  ownerMemberNo: string | null
  /** 当前拥有者会员昵称，未领取时为空。 */
  ownerMemberNickname: string | null
  /** 最新内容版本的公开状态；无内容版本时为 `null`。 */
  latestContentPublishStatus: string | null
  /** 最新内容版本的最新审核状态；无记录时为 `null`。 */
  latestContentReviewStatus: string | null
  /** 实际领取时间。 */
  claimedAt: string | null
}

/**
 * 查询藏品列表返回结构。
 */
export type ListCollectionsResponseData = PaginatedData<CollectionListItem>
