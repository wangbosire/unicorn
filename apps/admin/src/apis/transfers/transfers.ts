import type {
  GetTransferOperationsOverviewResponseData,
  ListTransferOperationRecordsQuery,
  ListTransferOperationRecordsResponseData,
  CompleteTransferOrderRequest,
  CompleteTransferOrderResponseData,
  ExpireTransferOrderRequest,
  ExpireTransferOrderResponseData,
  GetTransferOrderHistoryResponseData,
  ListTransferOrdersQuery,
  ListTransferOrdersResponseData,
  RollbackTransferOrderRequest,
  RollbackTransferOrderResponseData,
  SyncTransferOrderOwnerRequest,
  SyncTransferOrderOwnerResponseData,
} from '@contracts/admin/transfers'
import { apiClient } from '@/lib/api-client'

/**
 * 读取后台转让运营处置累计概览。
 */
export async function getTransferOperationsOverview(): Promise<GetTransferOperationsOverviewResponseData> {
  return apiClient.get('/admin-api/transfers/operations/overview')
}

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

/**
 * 分页查询后台转让运营处置记录。
 */
export async function listTransferOperationRecords(
  query: ListTransferOperationRecordsQuery
): Promise<ListTransferOperationRecordsResponseData> {
  return apiClient.get('/admin-api/transfers/operations', {
    params: query,
  })
}

/**
 * 运营手动释放一条超时未释放的待接收转让。
 */
export async function expireTransferOrder(
  transferId: string,
  payload: ExpireTransferOrderRequest
): Promise<ExpireTransferOrderResponseData> {
  return apiClient.post(`/admin-api/transfers/${transferId}/expire`, payload)
}

/**
 * 运营将一条已实质到账但仍停留待接收的转让补记为已完成。
 */
export async function completeTransferOrder(
  transferId: string,
  payload: CompleteTransferOrderRequest
): Promise<CompleteTransferOrderResponseData> {
  return apiClient.post(`/admin-api/transfers/${transferId}/complete`, payload)
}

/**
 * 运营将一条已完成转让回滚为发起方持有。
 */
export async function rollbackTransferOrder(
  transferId: string,
  payload: RollbackTransferOrderRequest
): Promise<RollbackTransferOrderResponseData> {
  return apiClient.post(`/admin-api/transfers/${transferId}/rollback`, payload)
}

/**
 * 运营修复一条已完成但归属未对齐的转让。
 */
export async function syncTransferOrderOwner(
  transferId: string,
  payload: SyncTransferOrderOwnerRequest
): Promise<SyncTransferOrderOwnerResponseData> {
  return apiClient.post(`/admin-api/transfers/${transferId}/sync-owner`, payload)
}

/**
 * 查询单条转让单的运营处置留痕。
 */
export async function getTransferOrderHistory(
  transferId: string
): Promise<GetTransferOrderHistoryResponseData> {
  return apiClient.get(`/admin-api/transfers/${transferId}/history`)
}
