/**
 * 单条生成结果。
 */
export type GeneratedActivationCode = {
  /** 激活码主键。 */
  id: string
  /** 唯一激活码。 */
  code: string
  /** 同步生成的藏品主键。 */
  collectionId: string
  /** 同步生成的藏品编号。 */
  collectionNo: string
  /** 激活码当前状态。 */
  status: string
}

/**
 * 批量生成激活码返回结构。
 */
export type GenerateActivationCodesResponseData = {
  /** 所属批次主键。 */
  batchId: string
  /** 实际生成数量。 */
  generatedCount: number
  /** 本次生成的激活码明细。 */
  activationCodes: GeneratedActivationCode[]
}
