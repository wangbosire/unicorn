/**
 * 批量生成激活码请求。
 * 生成过程中会同步创建待领取藏品资产。
 */
export class GenerateActivationCodesRequestDto {
  /** 所属批次主键。 */
  batchId!: string;

  /** 本次计划生成数量。 */
  count!: number;

  /** 发放渠道标识。 */
  issuedChannel!: string;
}
