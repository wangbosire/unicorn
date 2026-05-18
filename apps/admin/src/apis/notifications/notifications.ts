import type { GetNotificationsOverviewResponseData } from '@contracts/admin/notifications'
import { apiClient } from '@/lib/api-client'

/**
 * 读取后台通知中心总览。
 */
export async function getNotificationsOverview(): Promise<GetNotificationsOverviewResponseData> {
  return apiClient.get('/admin-api/notifications/overview')
}
