/**
 * 通用分页查询参数。
 * 当前约定页码从 1 开始，未传时由服务端补默认值。
 */
export type PaginationQuery = {
  /** 页码，从 1 开始。 */
  page?: number
  /** 每页条数，未传时由服务端补默认值。 */
  pageSize?: number
}

/**
 * 通用分页返回结构。
 * 所有分页接口统一返回 items/page/pageSize/total 四元组。
 */
export type PaginatedData<TItem> = {
  /** 当前页数据列表。 */
  items: TItem[]
  /** 当前页码，从 1 开始。 */
  page: number
  /** 当前页大小。 */
  pageSize: number
  /** 符合条件的总记录数，用于前端计算总页数。 */
  total: number
}
