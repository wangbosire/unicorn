export type CreateIssuanceBatchResponseData = {
  id: string
  batchNo: string
  seriesId: string
  name: string
  quantity: number
  status: string
}

/**
 * 创建或更新批次后的统一摘要（与创建返回结构一致）。
 */
export type IssuanceBatchMutationResponseData = CreateIssuanceBatchResponseData

