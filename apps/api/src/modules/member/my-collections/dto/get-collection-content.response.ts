/**
 * 藏品当前内容版本视图。
 */
export type CollectionContentVersionViewDto = {
  /** 内容版本主键。 */
  id: string;
  /** 单藏品内递增的版本号。 */
  versionNo: number;
  /** 展示标题。 */
  title: string;
  /** 展示摘要。 */
  summary: string;
  /** 展示封面图片地址。 */
  coverImageUrl: string | null;
  /** 结构化内容载荷，一期按 JSON 承载。 */
  contentPayload: Record<string, unknown>;
  /** 当前编辑状态。 */
  editStatus: string;
  /** 当前公开发布状态。 */
  publishStatus: string;
};

/**
 * 获取藏品内容返回结构。
 */
export type GetCollectionContentResponseDataDto = {
  /** 藏品主键。 */
  collectionId: string;
  /** 当前可编辑版本。 */
  currentVersion: CollectionContentVersionViewDto;
};
