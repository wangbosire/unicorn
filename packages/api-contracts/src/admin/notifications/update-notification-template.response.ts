/**
 * 更新通知模板返回结构。
 */
export type UpdateNotificationTemplateResponseData = {
  /** 模板主键。 */
  templateId: string
  /** 当前生效版本号。 */
  currentVersion: number
  /** 更新时间（毫秒时间戳）。 */
  updatedAt: number
}
