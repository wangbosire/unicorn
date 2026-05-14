import type {
  ListIssuanceBatchesQuery,
  ListIssuanceBatchesResponseData,
} from '@contracts/admin/issuance-batches'
import { apiClient } from '@/lib/api-client'

/**
 * 查询发行批次列表。
 * 统一复用共享契约中的查询参数和返回结构。
 */
export async function listIssuanceBatches(
  query: ListIssuanceBatchesQuery
): Promise<ListIssuanceBatchesResponseData> {
  return apiClient.get('/admin-api/issuance-batches', {
    params: query,
  })
}
