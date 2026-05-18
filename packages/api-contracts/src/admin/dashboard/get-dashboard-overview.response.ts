/**
 * 后台仪表盘总览统计。
 * 仅返回当前后端已具备真实模型支撑的核心指标。
 */
export type GetDashboardOverviewResponseData = {
  /** 激活码总量。 */
  activationCodesTotal: number
  /** 已使用激活码总量。 */
  usedActivationCodesTotal: number
  /** 已领取藏品总量。 */
  claimedCollectionsTotal: number
  /** 待领取藏品总量。 */
  pendingClaimCollectionsTotal: number
  /** 已冻结藏品总量。 */
  frozenCollectionsTotal: number
  /** 待人工复核内容数。 */
  pendingManualCollectionReviewsTotal: number
  /** 当前已公开内容版本数。 */
  publishedContentVersionsTotal: number
  /** 待人工审核评论数。 */
  pendingManualCommentsTotal: number
  /** 会员总数。 */
  membersTotal: number
  /** 本次统计生成时间（毫秒时间戳）。 */
  generatedAt: number
}
