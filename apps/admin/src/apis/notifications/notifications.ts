import type {
  CreateNotificationTemplateResponseData,
  GetNotificationDispatchRecordResponseData,
  GetNotificationDispatchHistoryResponseData,
  GetNotificationTemplateResponseData,
  GetNotificationsOverviewResponseData,
  ListNotificationFailureSummaryResponseData,
  ListNotificationDispatchRecordsResponseData,
  ListNotificationTemplatesResponseData,
  RetryNotificationDispatchResponseData,
  UpdateNotificationTemplateStatusRequest,
  UpdateNotificationTemplateStatusResponseData,
  UpdateNotificationTemplateResponseData,
  UpsertNotificationTemplateRequest,
} from '@contracts/admin/notifications'
import { apiClient } from '@/lib/api-client'

/**
 * 读取后台通知中心总览。
 */
export async function getNotificationsOverview(): Promise<GetNotificationsOverviewResponseData> {
  return apiClient.get('/admin-api/notifications/overview')
}

/**
 * 读取后台通知派发记录列表。
 */
export async function listNotificationDispatchRecords(params: {
  page: number
  pageSize: number
  messageType?: string
  channel?: 'IN_APP' | 'MINIAPP_SUBSCRIPTION' | 'WECHAT_MP'
  status?: 'PENDING' | 'SENT' | 'FAILED'
  failureCode?: string
}): Promise<ListNotificationDispatchRecordsResponseData> {
  return apiClient.get('/admin-api/notifications/dispatch-records', { params })
}

/**
 * 读取后台通知失败聚合视图。
 */
export async function listNotificationFailureSummary(params: {
  page: number
  pageSize: number
  messageType?: string
  channel?: 'IN_APP' | 'MINIAPP_SUBSCRIPTION' | 'WECHAT_MP'
  failureCode?: string
}): Promise<ListNotificationFailureSummaryResponseData> {
  return apiClient.get('/admin-api/notifications/failure-summary', { params })
}

/**
 * 读取单条派发记录的重试历史。
 */
export async function getNotificationDispatchHistory(
  dispatchRecordId: string
): Promise<GetNotificationDispatchHistoryResponseData> {
  return apiClient.get(
    `/admin-api/notifications/dispatch-records/${dispatchRecordId}/history`
  )
}

/**
 * 读取单条派发记录详情。
 */
export async function getNotificationDispatchRecord(
  dispatchRecordId: string
): Promise<GetNotificationDispatchRecordResponseData> {
  return apiClient.get(`/admin-api/notifications/dispatch-records/${dispatchRecordId}`)
}

/**
 * 将失败派发记录重新入队。
 */
export async function retryNotificationDispatch(
  dispatchRecordId: string
): Promise<RetryNotificationDispatchResponseData> {
  return apiClient.post(
    `/admin-api/notifications/dispatch-records/${dispatchRecordId}/retry`
  )
}

/**
 * 读取后台通知模板列表。
 */
export async function listNotificationTemplates(params: {
  page: number
  pageSize: number
  status?: 'ACTIVE' | 'DISABLED'
}): Promise<ListNotificationTemplatesResponseData> {
  return apiClient.get('/admin-api/notifications/templates', { params })
}

/**
 * 读取单个通知模板详情。
 */
export async function getNotificationTemplate(
  templateId: string
): Promise<GetNotificationTemplateResponseData> {
  return apiClient.get(`/admin-api/notifications/templates/${templateId}`)
}

/**
 * 新建通知模板并生成首个版本。
 */
export async function createNotificationTemplate(
  payload: UpsertNotificationTemplateRequest
): Promise<CreateNotificationTemplateResponseData> {
  return apiClient.post('/admin-api/notifications/templates', payload)
}

/**
 * 更新通知模板并生成新版本。
 */
export async function updateNotificationTemplate(
  templateId: string,
  payload: UpsertNotificationTemplateRequest
): Promise<UpdateNotificationTemplateResponseData> {
  return apiClient.patch(`/admin-api/notifications/templates/${templateId}`, payload)
}

/**
 * 更新通知模板启停状态。
 */
export async function updateNotificationTemplateStatus(
  templateId: string,
  payload: UpdateNotificationTemplateStatusRequest
): Promise<UpdateNotificationTemplateStatusResponseData> {
  return apiClient.patch(
    `/admin-api/notifications/templates/${templateId}/status`,
    payload
  )
}
