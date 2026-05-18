/**
 * 发起会员转让请求体。
 */
export type CreateMemberTransferRequest = {
  /** 转让方式。 */
  transferMode: 'DIRECT_MEMBER' | 'TRANSFER_CODE'
  /** 指定会员转让时的目标会员编号。 */
  toMemberNo?: string
}
