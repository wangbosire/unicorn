/**
 * 后台激活码详情。
 */
export type ActivationCodeDetail = {
  /** 激活码主键。 */
  id: string
  /** 激活码明文。 */
  code: string
  /** 所属批次主键。 */
  batchId: string
  /** 所属批次编号。 */
  batchNo: string
  /** 所属批次名称。 */
  batchName: string
  /** 对应藏品主键。 */
  collectionId: string
  /** 对应藏品编号。 */
  collectionNo: string
  /** 激活码状态。 */
  status: string
  /** 发放渠道；无则为 `null`。 */
  issuedChannel: string | null
  /** 发放时间（毫秒时间戳）；未发放时为 `null`。 */
  issuedAt: number | null
  /** 使用会员主键；未使用时为 `null`。 */
  usedByMemberId: string | null
  /** 使用会员编号；未使用时为 `null`。 */
  usedByMemberNo: string | null
  /** 使用时间（毫秒时间戳）；未使用时为 `null`。 */
  usedAt: number | null
  /** 失效时间（毫秒时间戳）；未设置时为 `null`。 */
  expiredAt: number | null
  /** 作废时间（毫秒时间戳）；未作废时为 `null`。 */
  voidedAt: number | null
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}
