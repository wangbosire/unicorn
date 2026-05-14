/**
 * 我的藏品列表项。
 */
export type MyCollectionListItemDto = {
  /** 藏品主键。 */
  id: string;
  /** 对外展示的藏品编号。 */
  collectionNo: string;
  /** 当前藏品资产状态。 */
  status: string;
  /** 所属系列名称。 */
  seriesName: string;
  /** 展示封面图地址，没有内容时可为空。 */
  coverImageUrl: string | null;
  /** 当前内容公开状态。 */
  contentPublishStatus: string;
  /** 实际领取时间。 */
  claimedAt: number | null;
};

/**
 * 查询我的藏品列表返回结构。
 */
export type ListMyCollectionsResponseDataDto = {
  /** 当前页结果。 */
  items: MyCollectionListItemDto[];
  /** 当前页码。 */
  page: number;
  /** 当前页大小。 */
  pageSize: number;
  /** 总记录数。 */
  total: number;
};
