/**
 * 作废激活码后的摘要（与列表项状态字段对齐）。
 */
export type VoidActivationCodeResponseData = {
  /** 激活码主键。 */
  id: string
  /** 激活码明文。 */
  code: string
  /** 更新后的状态，作废成功时为 `VOIDED`。 */
  status: string
}
