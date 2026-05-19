/**
 * 后台强制完成转让返回结构。
 */
export type CompleteTransferOrderResponseData = {
  /** 转让单主键。 */
  transferId: string
  /** 转让单号。 */
  transferNo: string
  /** 处置后状态。 */
  status: 'COMPLETED'
  /** 补记完成后的接收方主键。 */
  currentOwnerMemberId: string
  /** 本次运营处置时间（毫秒时间戳）。 */
  handledAt: number
}
