/**
 * 后台修复转让归属返回结构。
 */
export type SyncTransferOrderOwnerResponseData = {
  /** 转让单主键。 */
  transferId: string
  /** 转让单号。 */
  transferNo: string
  /** 藏品主键。 */
  collectionId: string
  /** 修复后的当前持有人主键。 */
  currentOwnerMemberId: string
  /** 本次运营处置时间（毫秒时间戳）。 */
  handledAt: number
}
