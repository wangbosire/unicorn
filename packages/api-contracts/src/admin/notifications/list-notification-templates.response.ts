import type { PaginatedData } from '../../common/pagination'

/**
 * 后台通知模板列表项。
 */
export type AdminNotificationTemplateListItem = {
  /** 模板主键。 */
  templateId: string
  /** 模板键，对齐消息类型。 */
  templateKey: string
  /** 后台展示名。 */
  displayName: string
  /** 模板说明。 */
  description: string | null
  /** 模板状态。 */
  status: 'ACTIVE' | 'DISABLED'
  /** 当前生效版本号；尚未发布时为 `null`。 */
  currentVersion: number | null
  /** 当前版本覆盖的渠道。 */
  channels: string[]
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}

/**
 * 查询后台通知模板列表返回结构。
 */
export type ListNotificationTemplatesResponseData =
  PaginatedData<AdminNotificationTemplateListItem>
