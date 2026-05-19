/**
 * 后台转让运营处置总览响应。
 */
export type GetTransferOperationsOverviewResponseData = {
  /** 累计运营处置记录总数。 */
  totalOperationRecords: number
  /** 累计释放超时单次数。 */
  expiredOperations: number
  /** 累计强制完成次数。 */
  forceCompletedOperations: number
  /** 累计强制回滚次数。 */
  forceRolledBackOperations: number
  /** 累计修复归属次数。 */
  syncedOwnerOperations: number
  /** 当前待处理的“超时未释放”异常数。 */
  expiredPendingReleaseAnomalies: number
  /** 当前待处理的“待接收但归属已到账”异常数。 */
  pendingAcceptOwnerAlreadyTransferredAnomalies: number
  /** 当前待处理的“已完成但归属未对齐”异常数。 */
  completedOwnerMismatchAnomalies: number
  /** 最近一次运营处置时间（毫秒时间戳）；从未处置时为 `null`。 */
  latestOperationAt: number | null
  /** 统计生成时间（毫秒时间戳）。 */
  generatedAt: number
}
