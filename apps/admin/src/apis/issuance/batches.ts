import type {
  CreateIssuanceBatchRequest,
  CreateIssuanceBatchResponseData,
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

/**
 * 创建发行批次。
 * 供 M1 后台最小发行闭环使用，创建成功后可继续进入激活码生成。
 */
export async function createIssuanceBatch(
  payload: CreateIssuanceBatchRequest
): Promise<CreateIssuanceBatchResponseData> {
  return apiClient.post('/admin-api/issuance-batches', payload)
}
