import type {
  ApproveCollectionReviewRequest,
  ApproveCollectionReviewResponseData,
  ListCollectionReviewHistoryQuery,
  ListCollectionReviewHistoryResponseData,
  ListCollectionReviewsQuery,
  ListCollectionReviewsResponseData,
  RejectCollectionReviewRequest,
  RejectCollectionReviewResponseData,
  TakedownPublishedContentVersionRequest,
  TakedownPublishedContentVersionResponseData,
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
 * 按藏品编号（及可选内容版本）拉取审核时间线（创建时间升序）。
 */
export async function listCollectionReviewHistory(
  query: ListCollectionReviewHistoryQuery
): Promise<ListCollectionReviewHistoryResponseData> {
  return apiClient.get('/admin-api/collection-reviews/history', {
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

/**
 * 运营下架：将已公开发布的已通过内容版本标记为 `TAKEDOWN`（公开展示将返回 410）。
 */
export async function takedownPublishedContentVersion(
  contentVersionId: string,
  payload: TakedownPublishedContentVersionRequest
): Promise<TakedownPublishedContentVersionResponseData> {
  const id = encodeURIComponent(contentVersionId.trim())
  return apiClient.post(
    `/admin-api/collection-reviews/content-versions/${id}/takedown`,
    payload
  )
}
