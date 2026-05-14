/**
 * 系列列表项。
 */
export type SeriesListItemDto = {
  /** 系列主键。 */
  id: string;
  /** 对外展示的系列编号。 */
  seriesNo: string;
  /** 系列名称。 */
  name: string;
  /** 系列描述。 */
  description: string;
  /** 系列状态。 */
  status: string;
  /** 创建时间。 */
  createdAt: number;
};

/**
 * 系列详情。
 */
export type SeriesDetailDto = {
  /** 系列主键。 */
  id: string;
  /** 对外展示的系列编号。 */
  seriesNo: string;
  /** 系列名称。 */
  name: string;
  /** 系列描述。 */
  description: string;
  /** 系列状态。 */
  status: string;
  /** 创建时间。 */
  createdAt: number;
  /** 更新时间。 */
  updatedAt: number;
};

/**
 * 分页列表返回结构。
 */
export type ListSeriesResponseDataDto = {
  /** 当前页结果。 */
  items: SeriesListItemDto[];
  /** 当前页码。 */
  page: number;
  /** 当前页大小。 */
  pageSize: number;
  /** 总记录数。 */
  total: number;
};

/**
 * 创建或编辑系列返回结构。
 */
export type SeriesMutationResponseDataDto = {
  /** 系列主键。 */
  id: string;
  /** 对外展示的系列编号。 */
  seriesNo: string;
  /** 系列名称。 */
  name: string;
  /** 系列描述。 */
  description: string;
  /** 系列状态。 */
  status: string;
};
