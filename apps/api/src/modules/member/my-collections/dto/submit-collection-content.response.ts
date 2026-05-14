/**
 * 提交藏品内容审核返回结构。
 */
export type SubmitCollectionContentResponseDataDto = {
  /** 已提交的内容版本主键。 */
  versionId: string;
  /** 提交后的编辑状态。 */
  editStatus: string;
  /** 提交后的审核状态。 */
  reviewStatus: string;
  /** 提交审核时间。 */
  submittedAt: number;
};
