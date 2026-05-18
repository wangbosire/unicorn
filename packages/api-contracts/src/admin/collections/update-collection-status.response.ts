/**
 * 更新藏品状态返回结构。
 */
export type UpdateCollectionStatusResponseData = {
  /** 藏品主键。 */
  id: string
  /** 对外展示的藏品编号。 */
  collectionNo: string
  /** 更新后的藏品状态。 */
  status: string
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}
