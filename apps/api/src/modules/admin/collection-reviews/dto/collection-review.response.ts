/**
 * 藏品内容审核列表项。
 */
export type CollectionReviewListItemDto = {
  /** 审核记录主键。 */
  reviewId: string;
  /** 所属藏品主键。 */
  collectionId: string;
  /** 对外展示的藏品编号。 */
  collectionNo: string;
  /** 对应内容版本主键。 */
  contentVersionId: string;
  /** 单藏品内递增的版本号。 */
  versionNo: number;
  /** 审核阶段。 */
  reviewStage: string;
  /** 当前审核状态。 */
  reviewStatus: string;
  /** 提交审核时间。 */
  submittedAt: number;
};

/**
 * 查询藏品内容审核队列返回结构。
 */
export type ListCollectionReviewsResponseDataDto = {
  /** 当前页结果。 */
  items: CollectionReviewListItemDto[];
  /** 当前页码。 */
  page: number;
  /** 当前页大小。 */
  pageSize: number;
  /** 总记录数。 */
  total: number;
};
