import type { PaginatedData } from '../../common'

/**
 * 权限变更日志行摘要。
 */
export type AdminAuthorizationChangeLogListItem = {
  /** 日志主键。 */
  changeLogId: string
  /** 变更目标类型。 */
  targetType: string
  /** 变更目标主键。 */
  targetId: string
  /** 目标稳定 key；无法解析时为 `null`。 */
  targetKey: string | null
  /** 目标展示名；无法解析时为 `null`。 */
  targetName: string | null
  /** 变更类型。 */
  changeType: string
  /** 操作人后台用户主键。 */
  operatorAdminUserId: string
  /** 操作人账号编号。 */
  operatorAccountNo: string
  /** 操作人登录用户名。 */
  operatorUsername: string
  /** 操作人展示名。 */
  operatorDisplayName: string
  /** 变更前快照；无则为 `null`。 */
  beforeSnapshot: unknown | null
  /** 变更后快照；无则为 `null`。 */
  afterSnapshot: unknown | null
  /** 本次变更说明；无则为 `null`。 */
  changeReason: string | null
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
}

export type ListAuthorizationChangeLogsResponseData =
  PaginatedData<AdminAuthorizationChangeLogListItem>
