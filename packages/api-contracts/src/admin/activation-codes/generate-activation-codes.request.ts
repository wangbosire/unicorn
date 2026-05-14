/**
 * 批量生成激活码请求。
 * 该操作会同步创建待领取的藏品资产。
 */
export type GenerateActivationCodesRequest = {
  /** 所属批次主键。 */
  batchId: string
  /** 本次计划生成数量。 */
  count: number
  /** 发放渠道标识。 */
  issuedChannel: string
}
