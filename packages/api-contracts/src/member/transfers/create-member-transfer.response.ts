/**
 * 发起会员转让返回结构。
 */
export type CreateMemberTransferResponseData = {
  /** 转让单主键。 */
  transferId: string
  /** 转让单号。 */
  transferNo: string
  /** 藏品主键。 */
  collectionId: string
  /** 藏品编号。 */
  collectionNo: string
  /** 转让方式。 */
  transferMode: string
  /** 转让状态。 */
  status: string
  /** 转让码；非转让码模式时为 `null`。 */
  transferCode: string | null
  /** 指定会员转让的目标会员编号；转让码模式时为 `null`。 */
  toMemberNo: string | null
  /** 指定会员转让的目标会员昵称；转让码模式时为 `null`。 */
  toMemberNickname: string | null
  /** 失效时间（毫秒时间戳）；未设置时为 `null`。 */
  expiredAt: number | null
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
}
