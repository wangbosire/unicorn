/**
 * 后台手动释放超时转让请求体。
 */
export type ExpireTransferOrderRequest = {
  /** 运营处置原因；用于日志留痕与后续对账。 */
  reason: string
}
