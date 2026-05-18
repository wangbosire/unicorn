/**
 * 撤销会员转让返回结构。
 */
export type CancelMemberTransferResponseData = {
  /** 转让单主键。 */
  transferId: string
  /** 转让单号。 */
  transferNo: string
  /** 藏品主键。 */
  collectionId: string
  /** 藏品编号。 */
  collectionNo: string
  /** 撤销后转让状态（恒为 CANCELLED）。 */
  status: string
  /** 撤销时间（毫秒时间戳）。 */
  cancelledAt: number
}
