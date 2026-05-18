import type { GetDashboardOverviewResponseData } from '@contracts/admin/dashboard'
import { apiClient } from '@/lib/api-client'

/**
 * 读取后台首页总览统计。
 */
export async function getDashboardOverview(): Promise<GetDashboardOverviewResponseData> {
  return apiClient.get('/admin-api/dashboard/overview')
}
