import type {
  GenerateActivationCodesRequest,
  GenerateActivationCodesResponseData,
  ListActivationCodesQuery,
  ListActivationCodesResponseData,
  VoidActivationCodeResponseData,
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

/**
 * 批量生成激活码。
 * 生成过程中会同步创建待领取藏品，用于打通 M1 后台发行主链路。
 */
export async function generateActivationCodes(
  payload: GenerateActivationCodesRequest
): Promise<GenerateActivationCodesResponseData> {
  return apiClient.post('/admin-api/activation-codes/generate', payload)
}

/**
 * 作废单条激活码（未使用且未过期）。
 */
export async function voidActivationCode(
  activationCodeId: string
): Promise<VoidActivationCodeResponseData> {
  return apiClient.post(
    `/admin-api/activation-codes/${encodeURIComponent(activationCodeId)}/void`,
    {}
  )
}
