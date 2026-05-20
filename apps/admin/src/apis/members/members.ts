import type {
  ListMembersQuery,
  ListMembersResponseData,
  UpdateMemberStatusRequest,
  UpdateMemberStatusResponseData,
} from '@contracts/admin/members'
import { apiClient } from '@/lib/api-client'

/**
 * 分页查询会员列表（与 `MembersController` 对齐）。
 */
export async function listMembers(
  query: ListMembersQuery
): Promise<ListMembersResponseData> {
  return apiClient.get('/admin-api/members', { params: query })
}

/**
 * 统一更新会员状态；按目标状态分别要求 `members.freeze` / `members.unfreeze` 权限。
 */
export async function updateMemberStatus(
  memberId: string,
  payload: UpdateMemberStatusRequest
): Promise<UpdateMemberStatusResponseData> {
  const id = encodeURIComponent(memberId.trim())
  return apiClient.patch(`/admin-api/members/${id}/status`, payload)
}

/**
 * 冻结会员（需 `members.freeze` 权限）。
 */
export async function freezeMember(
  memberId: string
): Promise<UpdateMemberStatusResponseData> {
  const id = encodeURIComponent(memberId.trim())
  return apiClient.patch(`/admin-api/members/${id}/freeze`)
}

/**
 * 解冻会员（需 `members.unfreeze` 权限）。
 */
export async function unfreezeMember(
  memberId: string
): Promise<UpdateMemberStatusResponseData> {
  const id = encodeURIComponent(memberId.trim())
  return apiClient.patch(`/admin-api/members/${id}/unfreeze`)
}
