/**
 * 将已公开发布的内容版本下架为 `TAKEDOWN` 的请求体。
 */
export type TakedownPublishedContentVersionRequest = {
  /** 下架原因或内部备注（可选）。 */
  reason?: string
}
