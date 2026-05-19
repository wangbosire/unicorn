/**
 * 后台强制回滚转让返回结构。
 */
export type RollbackTransferOrderResponseData = {
  /** 转让单主键。 */
  transferId: string
  /** 转让单号。 */
  transferNo: string
  /** 处置后状态。 */
  status: 'ROLLED_BACK'
  /** 回滚后的当前持有人主键。 */
  currentOwnerMemberId: string
  /** 本次运营处置时间（毫秒时间戳）。 */
  handledAt: number
}
