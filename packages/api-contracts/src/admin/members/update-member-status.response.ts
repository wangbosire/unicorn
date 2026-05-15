/**
 * 更新会员状态后的返回数据。
 */
export type UpdateMemberStatusResponseData = {
  memberId: string
  memberNo: string
  status: string
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}
