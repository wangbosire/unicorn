/**
 * 后台强制回滚转让请求体。
 */
export type RollbackTransferOrderRequest = {
  /** 运营处置原因；用于留痕和后续对账。 */
  reason: string
}
