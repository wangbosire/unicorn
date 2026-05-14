/**
 * 更新发行批次状态请求。
 */
export type UpdateIssuanceBatchStatusRequest = {
  /** 目标状态，仅允许 ENABLED 或 DISABLED。 */
  status: 'ENABLED' | 'DISABLED'
}
