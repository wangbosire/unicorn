import type { PaginatedData } from '../../common'

/**
 * 激活码列表项。
 */
export type ActivationCodeListItem = {
  /** 激活码主键。 */
  id: string
  /** 唯一激活码。 */
  code: string
  /** 所属批次主键。 */
  batchId: string
  /** 所属批次名称。 */
  batchName: string
  /** 对应藏品主键。 */
  collectionId: string
  /** 对应藏品编号。 */
  collectionNo: string
  /** 激活码状态。 */
  status: string
  /** 失效时间戳，单位毫秒；未设置失效时间时为 null。 */
  expiredAt: number | null
}

/**
 * 查询激活码列表返回结构。
 */
export type ListActivationCodesResponseData = PaginatedData<ActivationCodeListItem>
