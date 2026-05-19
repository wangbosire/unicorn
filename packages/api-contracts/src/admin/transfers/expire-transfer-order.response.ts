/**
 * 后台手动释放超时转让返回结构。
 */
export type ExpireTransferOrderResponseData = {
  /** 转让单主键。 */
  transferId: string
  /** 转让单号。 */
  transferNo: string
  /** 处置后状态。 */
  status: 'EXPIRED'
  /** 本次运营处置时间（毫秒时间戳）。 */
  handledAt: number
}
