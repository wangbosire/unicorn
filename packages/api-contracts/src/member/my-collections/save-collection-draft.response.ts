/**
 * 保存藏品内容草稿返回结构。
 */
export type SaveCollectionDraftResponseData = {
  /** 内容版本主键。 */
  versionId: string
  /** 单藏品内递增的版本号。 */
  versionNo: number
  /** 当前编辑状态。 */
  editStatus: string
  /** 当前公开状态。 */
  publishStatus: string
  /** 最近更新时间。 */
  updatedAt: number
}
