import type { PaginatedData } from '../../common'

/**
 * 后台转让记录列表项。
 */
export type AdminTransferOrderListItem = {
  /** 转让单主键。 */
  transferId: string
  /** 转让单号。 */
  transferNo: string
  /** 藏品主键。 */
  collectionId: string
  /** 藏品编号。 */
  collectionNo: string
  /** 所属系列编号。 */
  seriesNo: string
  /** 所属系列名称。 */
  seriesName: string
  /** 所属批次编号。 */
  batchNo: string
  /** 所属批次名称。 */
  batchName: string
  /** 转出会员主键。 */
  fromMemberId: string
  /** 转出会员编号。 */
  fromMemberNo: string
  /** 转出会员昵称。 */
  fromMemberNickname: string
  /** 转入会员主键；转让码待接收时为空。 */
  toMemberId: string | null
  /** 转入会员编号；转让码待接收时为空。 */
  toMemberNo: string | null
  /** 转入会员昵称；转让码待接收时为空。 */
  toMemberNickname: string | null
  /** 转让方式。 */
  transferMode: string
  /** 转让码；指定会员转让时为空。 */
  transferCode: string | null
  /** 转让状态。 */
  status: string
  /** 归一化异常编码；无异常时为 `null`。 */
  anomalyCode: string | null
  /** 归一化异常标签；无异常时为 `null`。 */
  anomalyLabel: string | null
  /** 失效时间（毫秒时间戳）；未设置时为 `null`。 */
  expiredAt: number | null
  /** 完成时间（毫秒时间戳）；未完成时为 `null`。 */
  completedAt: number | null
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
}

export type ListTransferOrdersResponseData = PaginatedData<AdminTransferOrderListItem>
