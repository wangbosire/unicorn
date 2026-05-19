/**
 * 单条渠道模板文案。
 */
export type AdminNotificationTemplateChannel = {
  /** 渠道枚举值。 */
  channel: string
  /** 渠道标题模板。 */
  title: string
  /** 渠道正文模板。 */
  content: string
}

/**
 * 通知模板历史版本摘要。
 */
export type AdminNotificationTemplateVersionSummary = {
  /** 版本主键。 */
  versionId: string
  /** 版本号。 */
  version: number
  /** 变更说明。 */
  changeNote: string | null
  /** 该版本的渠道文案快照。 */
  channels: AdminNotificationTemplateChannel[]
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
}

/**
 * 后台通知模板详情。
 */
export type GetNotificationTemplateResponseData = {
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
  /** 当前生效版本主键；尚未发布时为 `null`。 */
  currentVersionId: string | null
  /** 当前生效版本号；尚未发布时为 `null`。 */
  currentVersion: number | null
  /** 当前生效文案。 */
  channels: AdminNotificationTemplateChannel[]
  /** 历史版本摘要，按版本倒序。 */
  versions: AdminNotificationTemplateVersionSummary[]
  /** 创建时间（毫秒时间戳）。 */
  createdAt: number
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}
