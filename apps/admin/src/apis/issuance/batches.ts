import type {
  CreateIssuanceBatchRequest,
  CreateIssuanceBatchResponseData,
  IssuanceBatchDetail,
  IssuanceBatchMutationResponseData,
  ListIssuanceBatchesQuery,
  ListIssuanceBatchesResponseData,
  UpdateIssuanceBatchRequest,
  UpdateIssuanceBatchStatusRequest,
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
 * 查询单个发行批次详情（含备注等列表未返回字段）。
 */
export async function getIssuanceBatch(
  batchId: string
): Promise<IssuanceBatchDetail> {
  return apiClient.get(`/admin-api/issuance-batches/${batchId}`)
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

/**
 * 编辑发行批次基础信息（名称、数量、激活有效期、备注）。
 */
export async function updateIssuanceBatch(
  batchId: string,
  payload: UpdateIssuanceBatchRequest
): Promise<IssuanceBatchMutationResponseData> {
  return apiClient.patch(`/admin-api/issuance-batches/${batchId}`, payload)
}

/**
 * 更新发行批次启用 / 停用状态。
 */
export async function updateIssuanceBatchStatus(
  batchId: string,
  payload: UpdateIssuanceBatchStatusRequest
): Promise<IssuanceBatchMutationResponseData> {
  return apiClient.patch(`/admin-api/issuance-batches/${batchId}/status`, payload)
}
