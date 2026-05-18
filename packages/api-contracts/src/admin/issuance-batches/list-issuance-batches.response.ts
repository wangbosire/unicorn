import type { PaginatedData } from '../../common'

/**
 * 发行批次列表项。
 */
export type IssuanceBatchListItem = {
  /** 批次主键。 */
  id: string
  /** 对外展示的批次编号。 */
  batchNo: string
  /** 所属系列主键。 */
  seriesId: string
  /** 所属系列名称。 */
  seriesName: string
  /** 所属系列状态（如 ENABLED / DISABLED）。 */
  seriesStatus: string
  /** 批次名称。 */
  name: string
  /** 计划发行数量。 */
  quantity: number
  /** 已生成激活码数量。 */
  generatedCount: number
  /** 当前剩余可生成数量。 */
  remainingQuantity: number
  /** 未发放激活码数量。 */
  unissuedActivationCodesCount: number
  /** 已发放未使用激活码数量。 */
  issuedActivationCodesCount: number
  /** 已使用激活码数量。 */
  usedActivationCodesCount: number
  /** 已作废激活码数量。 */
  voidedActivationCodesCount: number
  /** 已过期激活码数量。 */
  expiredActivationCodesCount: number
  /** 待领取藏品数量。 */
  pendingClaimCollectionsCount: number
  /** 已领取藏品数量。 */
  claimedCollectionsCount: number
  /** 已冻结藏品数量。 */
  frozenCollectionsCount: number
  /** 批次状态。 */
  status: string
  /** 激活有效开始时间戳，单位毫秒。 */
  activateValidFrom: number
  /** 激活有效结束时间戳，单位毫秒。 */
  activateValidTo: number
}

/**
 * 查询发行批次列表返回结构。
 */
export type ListIssuanceBatchesResponseData = PaginatedData<IssuanceBatchListItem>
