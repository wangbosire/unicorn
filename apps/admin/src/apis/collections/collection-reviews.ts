import type {
  ApproveCollectionReviewRequest,
  ApproveCollectionReviewResponseData,
  ListCollectionReviewsQuery,
  ListCollectionReviewsResponseData,
  RejectCollectionReviewRequest,
  RejectCollectionReviewResponseData,
} from '@contracts/admin/collection-reviews'
import { apiClient } from '@/lib/api-client'

/**
 * 分页查询藏品内容审核记录（与 Nest `CollectionReviewsController` 对齐）。
 */
export async function listCollectionReviews(
  query: ListCollectionReviewsQuery
): Promise<ListCollectionReviewsResponseData> {
  return apiClient.get('/admin-api/collection-reviews', {
    params: query,
  })
}

/**
 * 人工通过藏品内容审核（仅 `PENDING_MANUAL` 可成功，见服务端校验）。
 */
export async function approveCollectionReview(
  reviewId: string,
  payload: ApproveCollectionReviewRequest
): Promise<ApproveCollectionReviewResponseData> {
  const id = encodeURIComponent(reviewId.trim())
  return apiClient.post(`/admin-api/collection-reviews/${id}/approve`, payload)
}

/**
 * 人工驳回藏品内容审核（仅 `PENDING_MANUAL`；须提供驳回原因）。
 */
export async function rejectCollectionReview(
  reviewId: string,
  payload: RejectCollectionReviewRequest
): Promise<RejectCollectionReviewResponseData> {
  const id = encodeURIComponent(reviewId.trim())
  return apiClient.post(`/admin-api/collection-reviews/${id}/reject`, payload)
}
