/**
 * 更新系列状态请求。
 * status 仅允许 ENABLED / DISABLED，与 Prisma `SeriesStatus` 枚举一致。
 */
export type UpdateSeriesStatusRequest = {
  /** 目标状态，仅允许 ENABLED 或 DISABLED。 */
  status: 'ENABLED' | 'DISABLED'
}
