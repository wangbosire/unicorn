/**
 * 更新通知模板状态请求体。
 */
export type UpdateNotificationTemplateStatusRequest = {
  /** 模板状态。 */
  status: 'ACTIVE' | 'DISABLED'
}
