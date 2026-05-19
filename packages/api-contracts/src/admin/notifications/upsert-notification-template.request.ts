/**
 * 单条渠道模板文案入参。
 */
export type UpsertNotificationTemplateChannelInput = {
  /** 渠道枚举值。 */
  channel: 'IN_APP' | 'MINIAPP_SUBSCRIPTION' | 'WECHAT_MP'
  /** 渠道标题模板。 */
  title: string
  /** 渠道正文模板。 */
  content: string
}

/**
 * 新建或更新通知模板请求体。
 */
export type UpsertNotificationTemplateRequest = {
  /** 模板键，对齐消息类型。 */
  templateKey: string
  /** 后台展示名。 */
  displayName: string
  /** 模板说明。 */
  description?: string | null
  /** 变更说明。 */
  changeNote?: string | null
  /** 渠道文案列表。 */
  channels: UpsertNotificationTemplateChannelInput[]
}
