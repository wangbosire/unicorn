import type {
  ListActivationCodesQuery,
  ListActivationCodesResponseData,
} from '@contracts/admin/activation-codes'
import { apiClient } from '@/lib/api-client'

/**
 * 查询激活码列表。
 * 统一复用共享契约中的查询参数和返回结构。
 */
export async function listActivationCodes(
  query: ListActivationCodesQuery
): Promise<ListActivationCodesResponseData> {
  return apiClient.get('/admin-api/activation-codes', {
    params: query,
  })
}
