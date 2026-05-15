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
 * 更新会员状态（需 `members.manage` 权限）。
 */
export async function updateMemberStatus(
  memberId: string,
  payload: UpdateMemberStatusRequest
): Promise<UpdateMemberStatusResponseData> {
  const id = encodeURIComponent(memberId.trim())
  return apiClient.patch(`/admin-api/members/${id}/status`, payload)
}
