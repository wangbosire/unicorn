/**
 * 激活码列表项。
 */
export type ActivationCodeListItemDto = {
  /** 激活码主键。 */
  id: string;
  /** 唯一激活码。 */
  code: string;
  /** 所属批次主键。 */
  batchId: string;
  /** 所属批次名称。 */
  batchName: string;
  /** 对应藏品主键。 */
  collectionId: string;
  /** 对应藏品编号。 */
  collectionNo: string;
  /** 激活码状态。 */
  status: string;
  /** 失效时间。 */
  expiredAt: number | null;
};

/**
 * 分页列表返回结构。
 */
export type ListActivationCodesResponseDataDto = {
  /** 当前页结果。 */
  items: ActivationCodeListItemDto[];
  /** 当前页码。 */
  page: number;
  /** 当前页大小。 */
  pageSize: number;
  /** 总记录数。 */
  total: number;
};

/**
 * 单条生成结果。
 */
export type GeneratedActivationCodeDto = {
  /** 激活码主键。 */
  id: string;
  /** 唯一激活码。 */
  code: string;
  /** 同步生成的藏品主键。 */
  collectionId: string;
  /** 同步生成的藏品编号。 */
  collectionNo: string;
  /** 激活码当前状态。 */
  status: string;
};

/**
 * 批量生成激活码返回结构。
 */
export type GenerateActivationCodesResponseDataDto = {
  /** 所属批次主键。 */
  batchId: string;
  /** 实际生成数量。 */
  generatedCount: number;
  /** 本次生成的激活码明细。 */
  activationCodes: GeneratedActivationCodeDto[];
};
