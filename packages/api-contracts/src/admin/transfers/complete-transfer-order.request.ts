/**
 * 后台强制完成转让请求体。
 */
export type CompleteTransferOrderRequest = {
  /** 运营处置原因；用于留痕和后续对账。 */
  reason: string
}
