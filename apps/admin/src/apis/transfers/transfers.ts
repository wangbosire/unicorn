import type {
  ListTransferOrdersQuery,
  ListTransferOrdersResponseData,
} from '@contracts/admin/transfers'
import { apiClient } from '@/lib/api-client'

/**
 * 分页查询后台转让记录。
 */
export async function listTransferOrders(
  query: ListTransferOrdersQuery
): Promise<ListTransferOrdersResponseData> {
  return apiClient.get('/admin-api/transfers', {
    params: query,
  })
}
