/**
 * 发行批次列表项。
 */
export type IssuanceBatchListItemDto = {
  /** 批次主键。 */
  id: string;
  /** 对外展示的批次编号。 */
  batchNo: string;
  /** 所属系列主键。 */
  seriesId: string;
  /** 所属系列名称。 */
  seriesName: string;
  /** 批次名称。 */
  name: string;
  /** 计划发行数量。 */
  quantity: number;
  /** 已生成激活码数量。 */
  generatedCount: number;
  /** 批次状态。 */
  status: string;
  /** 激活有效开始时间。 */
  activateValidFrom: number;
  /** 激活有效结束时间。 */
  activateValidTo: number;
};

/**
 * 发行批次详情。
 */
export type IssuanceBatchDetailDto = {
  /** 批次主键。 */
  id: string;
  /** 对外展示的批次编号。 */
  batchNo: string;
  /** 所属系列主键。 */
  seriesId: string;
  /** 所属系列名称。 */
  seriesName: string;
  /** 批次名称。 */
  name: string;
  /** 计划发行数量。 */
  quantity: number;
  /** 已生成激活码数量。 */
  generatedCount: number;
  /** 批次状态。 */
  status: string;
  /** 激活有效开始时间。 */
  activateValidFrom: number;
  /** 激活有效结束时间。 */
  activateValidTo: number;
  /** 运营备注。 */
  remark: string | null;
  /** 创建时间。 */
  createdAt: number;
  /** 更新时间。 */
  updatedAt: number;
};

/**
 * 分页列表返回结构。
 */
export type ListIssuanceBatchesResponseDataDto = {
  /** 当前页结果。 */
  items: IssuanceBatchListItemDto[];
  /** 当前页码。 */
  page: number;
  /** 当前页大小。 */
  pageSize: number;
  /** 总记录数。 */
  total: number;
};

/**
 * 创建或编辑批次返回结构。
 */
export type IssuanceBatchMutationResponseDataDto = {
  /** 批次主键。 */
  id: string;
  /** 对外展示的批次编号。 */
  batchNo: string;
  /** 所属系列主键。 */
  seriesId: string;
  /** 批次名称。 */
  name: string;
  /** 计划发行数量。 */
  quantity: number;
  /** 批次状态。 */
  status: string;
};
