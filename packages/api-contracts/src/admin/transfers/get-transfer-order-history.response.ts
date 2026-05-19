/**
 * 单条转让运营处置记录。
 */
export type AdminTransferOrderHistoryItem = {
  /** 处置记录主键。 */
  operationRecordId: string
  /** 处置动作类型。 */
  actionType:
    | 'ADMIN_EXPIRE'
    | 'ADMIN_SYNC_OWNER'
    | 'ADMIN_FORCE_COMPLETE'
    | 'ADMIN_FORCE_ROLLBACK'
  /** 处置动作标签。 */
  actionLabel: string
  /** 运营填写的处置原因。 */
  reason: string
  /** 操作管理员主键；匿名处置时为空。 */
  operatorAdminUserId: string | null
  /** 操作管理员账号编号；匿名处置时为空。 */
  operatorAdminAccountNo: string | null
  /** 操作管理员展示名；匿名处置时为空。 */
  operatorAdminDisplayName: string | null
  /** 处置前转让状态。 */
  beforeStatus: string | null
  /** 处置后转让状态。 */
  afterStatus: string | null
  /** 处置前藏品当前持有人主键。 */
  beforeCurrentOwnerMemberId: string | null
  /** 处置后藏品当前持有人主键。 */
  afterCurrentOwnerMemberId: string | null
  /** 留痕写入时间（毫秒时间戳）。 */
  createdAt: number
}

/**
 * 单条转让单运营留痕时间线。
 */
export type GetTransferOrderHistoryResponseData = {
  /** 转让单主键。 */
  transferId: string
  /** 转让单号。 */
  transferNo: string
  /** 总留痕条数。 */
  totalRecords: number
  /** 按时间倒序排列的运营留痕。 */
  items: AdminTransferOrderHistoryItem[]
}
