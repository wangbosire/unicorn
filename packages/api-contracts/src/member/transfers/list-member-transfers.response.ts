import type { PaginatedData } from '../../common/pagination'

/**
 * 当前会员转让记录列表项。
 */
export type MemberTransferListItem = {
  /** 转让单主键。 */
  transferId: string
  /** 转让单号。 */
  transferNo: string
  /** 藏品主键。 */
  collectionId: string
  /** 藏品编号。 */
  collectionNo: string
  /** 当前查看者视角。 */
  direction: 'outgoing' | 'incoming'
  /** 转让方式。 */
  transferMode: string
  /** 转让状态。 */
  status: string
  /** 转让码；非转让码模式时为 `null`。 */
  transferCode: string | null
  /** 对方会员编号；无对方时为 `null`。 */
  counterpartMemberNo: string | null
  /** 对方会员昵称；无对方时为 `null`。 */
  counterpartNickname: string | null
  /** 失效时间（毫秒时间戳）；未设置时为 `null`。 */
  expiredAt: number | null
  /** 完成时间（毫秒时间戳）；未完成时为 `null`。 */
  completedAt: number | null
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
}

/**
 * 查询当前会员转让记录返回结构。
 */
export type ListMemberTransfersResponseData = PaginatedData<MemberTransferListItem>
