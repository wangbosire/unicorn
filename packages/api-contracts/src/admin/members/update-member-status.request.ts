/**
 * 更新会员状态请求体。
 */
export type UpdateMemberStatusRequest = {
  /** 目标状态，与 `MemberStatus` 枚举一致。 */
  status: 'ACTIVE' | 'FROZEN'
}
