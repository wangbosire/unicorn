/**
 * 更新藏品状态请求体。
 */
export type UpdateCollectionStatusRequest = {
  /** 目标状态，仅允许 `OWNED` 或 `FROZEN`。 */
  status: 'OWNED' | 'FROZEN'
}
