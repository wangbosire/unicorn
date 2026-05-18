/**
 * 接收会员转让返回结构。
 */
export type AcceptMemberTransferResponseData = {
  /** 转让单主键。 */
  transferId: string
  /** 转让单号。 */
  transferNo: string
  /** 藏品主键。 */
  collectionId: string
  /** 藏品编号。 */
  collectionNo: string
  /** 当前转让状态。 */
  status: string
  /** 当前新持有会员主键。 */
  currentOwnerMemberId: string
  /** 当前新持有会员编号。 */
  currentOwnerMemberNo: string
  /** 当前新持有会员昵称。 */
  currentOwnerNickname: string
  /** 完成时间（毫秒时间戳）。 */
  completedAt: number
}
