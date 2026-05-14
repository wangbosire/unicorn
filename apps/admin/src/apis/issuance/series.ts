import type {
  CreateSeriesRequest,
  CreateSeriesResponseData,
  ListSeriesQuery,
  ListSeriesResponseData,
  SeriesMutationResponseData,
  UpdateSeriesRequest,
  UpdateSeriesStatusRequest,
} from '@contracts/admin/series'
import { apiClient } from '@/lib/api-client'

/**
 * 查询系列列表。
 * 统一复用共享契约中的查询参数和返回结构，避免前端重复维护接口类型。
 */
export async function listSeries(
  query: ListSeriesQuery
): Promise<ListSeriesResponseData> {
  return apiClient.get('/admin-api/series', {
    params: query,
  })
}

/**
 * 创建系列。
 * 供 M1 后台最小发行闭环使用，创建成功后可继续进入批次配置。
 */
export async function createSeries(
  payload: CreateSeriesRequest
): Promise<CreateSeriesResponseData> {
  return apiClient.post('/admin-api/series', payload)
}

/**
 * 编辑系列基础信息。
 */
export async function updateSeries(
  seriesId: string,
  payload: UpdateSeriesRequest
): Promise<SeriesMutationResponseData> {
  return apiClient.patch(`/admin-api/series/${seriesId}`, payload)
}

/**
 * 更新系列启用 / 停用状态。
 */
export async function updateSeriesStatus(
  seriesId: string,
  payload: UpdateSeriesStatusRequest
): Promise<SeriesMutationResponseData> {
  return apiClient.patch(`/admin-api/series/${seriesId}/status`, payload)
}
