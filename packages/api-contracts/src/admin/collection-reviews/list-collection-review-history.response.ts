/**
 * 单条审核历史记录（时间线中的一步）。
 */
export type CollectionReviewHistoryItem = {
  /** 审核记录主键。 */
  reviewId: string
  /** 对外藏品编号。 */
  collectionNo: string
  /** 内容版本主键。 */
  contentVersionId: string
  /** 单藏品内版本号。 */
  versionNo: number
  /** 审核阶段：`MACHINE` | `MANUAL`。 */
  reviewStage: string
  /** 审核状态枚举字符串。 */
  reviewStatus: string
  /** 审核来源：`SYSTEM` | `ADMIN`。 */
  reviewSource: string
  /** 原因或备注；无则为 `null`。 */
  reviewReason: string | null
  /** 记录创建时间（毫秒时间戳）。 */
  createdAt: number
  /** 审核完成时间；未完成则为 `null`。 */
  reviewedAt: number | null
  /**
   * 执行人工审核的管理员展示名；
   * 系统行为或尚未有人工落点时均为 `null`。
   */
  reviewedByDisplayName: string | null
}

/**
 * 审核轨迹列表（按 `createdAt` 升序，便于运营按时间阅读）。
 */
export type ListCollectionReviewHistoryResponseData = {
  items: CollectionReviewHistoryItem[]
}
