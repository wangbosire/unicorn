/**
 * 更新通知模板状态返回结构。
 */
export type UpdateNotificationTemplateStatusResponseData = {
  /** 模板主键。 */
  templateId: string
  /** 模板状态。 */
  status: 'ACTIVE' | 'DISABLED'
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}
