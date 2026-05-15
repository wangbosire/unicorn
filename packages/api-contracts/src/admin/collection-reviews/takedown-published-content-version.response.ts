/**
 * 下架已公开发布版本后的返回数据。
 */
export type TakedownPublishedContentVersionResponseData = {
  /** 内容版本主键。 */
  contentVersionId: string
  /** 藏品对外编号。 */
  collectionNo: string
  /** 固定为 `TAKEDOWN`。 */
  publishStatus: 'TAKEDOWN'
  /** 生效时间（毫秒时间戳）。 */
  appliedAt: number
}
