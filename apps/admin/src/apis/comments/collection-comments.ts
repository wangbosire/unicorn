import type {
  ApproveCollectionCommentRequest,
  ApproveCollectionCommentResponseData,
  BlockCollectionCommentRequest,
  BlockCollectionCommentResponseData,
  ListCollectionCommentReviewsQuery,
  ListCollectionCommentReviewsResponseData,
  ListCollectionCommentsQuery,
  ListCollectionCommentsResponseData,
  RejectCollectionCommentRequest,
  RejectCollectionCommentResponseData,
} from '@contracts/admin/collection-comments'
import { apiClient } from '@/lib/api-client'

/**
 * 分页查询后台评论列表。
 */
export async function listCollectionComments(
  query: ListCollectionCommentsQuery
): Promise<ListCollectionCommentsResponseData> {
  return apiClient.get('/admin-api/collection-comments', {
    params: query,
  })
}

/**
 * 分页查询后台评论审核队列。
 */
export async function listCollectionCommentReviews(
  query: ListCollectionCommentReviewsQuery
): Promise<ListCollectionCommentReviewsResponseData> {
  return apiClient.get('/admin-api/collection-comments/reviews', {
    params: query,
  })
}

/**
 * 人工通过评论审核。
 */
export async function approveCollectionComment(
  commentId: string,
  payload: ApproveCollectionCommentRequest
): Promise<ApproveCollectionCommentResponseData> {
  const id = encodeURIComponent(commentId.trim())
  return apiClient.post(`/admin-api/collection-comments/${id}/approve`, payload)
}

/**
 * 人工驳回评论审核。
 */
export async function rejectCollectionComment(
  commentId: string,
  payload: RejectCollectionCommentRequest
): Promise<RejectCollectionCommentResponseData> {
  const id = encodeURIComponent(commentId.trim())
  return apiClient.post(`/admin-api/collection-comments/${id}/reject`, payload)
}

/**
 * 屏蔽已通过审核或已公开的评论。
 */
export async function blockCollectionComment(
  commentId: string,
  payload: BlockCollectionCommentRequest
): Promise<BlockCollectionCommentResponseData> {
  const id = encodeURIComponent(commentId.trim())
  return apiClient.post(`/admin-api/collection-comments/${id}/block`, payload)
}
