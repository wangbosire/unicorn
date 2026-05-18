import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api-error'
import {
  buildCollectionCommentReviewsQueryParams,
  buildCollectionCommentsQueryParams,
  COMMENT_STATUS_FILTER_ALL,
  formatCollectionCommentReviewSource,
  formatCollectionCommentStatus,
  formatCommentTreeType,
  mapApproveCollectionCommentErrorMessage,
  mapBlockCollectionCommentErrorMessage,
  mapListCollectionCommentReviewsErrorMessage,
  mapListCollectionCommentsErrorMessage,
  mapRejectCollectionCommentErrorMessage,
  rowMayApproveOrRejectCommentReview,
  rowMayBlockComment,
} from '@/lib/collection-comments-display'

describe('collection-comments-display', () => {
  it('formats comment status and tree type', () => {
    expect(formatCollectionCommentStatus('PENDING_MANUAL')).toBe('待人工审核')
    expect(formatCommentTreeType(true)).toBe('一级评论')
    expect(formatCommentTreeType(false)).toBe('二级回复')
    expect(formatCollectionCommentReviewSource('SYSTEM')).toBe('系统')
    expect(formatCollectionCommentReviewSource(null)).toBe('—')
  })

  it('builds list query params without all-status placeholder', () => {
    expect(
      buildCollectionCommentsQueryParams({
        page: 2,
        pageSize: 20,
        status: COMMENT_STATUS_FILTER_ALL,
        collectionNoFilter: ' COL-001 ',
      })
    ).toEqual({
      page: '2',
      pageSize: '20',
      collectionNo: 'COL-001',
    })

    expect(
      buildCollectionCommentReviewsQueryParams({
        page: 1,
        pageSize: 20,
        reviewStatus: 'PENDING_MANUAL',
        collectionNoFilter: '',
      })
    ).toEqual({
      page: '1',
      pageSize: '20',
      reviewStatus: 'PENDING_MANUAL',
    })
  })

  it('guards available review actions by row status', () => {
    expect(rowMayApproveOrRejectCommentReview({ status: 'PENDING_MANUAL' } as never)).toBe(
      true
    )
    expect(rowMayApproveOrRejectCommentReview({ status: 'MANUAL_APPROVED' } as never)).toBe(
      false
    )
    expect(rowMayBlockComment({ status: 'MANUAL_APPROVED' })).toBe(true)
    expect(rowMayBlockComment({ status: 'BLOCKED' })).toBe(false)
  })

  it('maps list and mutation errors to operator-friendly copy', () => {
    const forbidden = new ApiError({
      code: 'ADMIN_AUTH_FORBIDDEN',
      message: 'forbidden',
    })
    expect(mapListCollectionCommentsErrorMessage(forbidden)).toContain('评论治理')
    expect(mapListCollectionCommentReviewsErrorMessage(forbidden)).toContain('评论治理')

    const invalidApprove = new ApiError({
      code: 'COMMENT_REVIEW_STATUS_INVALID',
      message: 'invalid',
    })
    expect(mapApproveCollectionCommentErrorMessage(invalidApprove)).toContain('人工通过')

    const invalidReject = new ApiError({
      code: 'COMMENT_REVIEW_STATUS_INVALID',
      message: 'invalid',
    })
    expect(mapRejectCollectionCommentErrorMessage(invalidReject)).toContain('人工驳回')

    const invalidBlock = new ApiError({
      code: 'COMMENT_BLOCK_STATUS_INVALID',
      message: 'invalid',
    })
    expect(mapBlockCollectionCommentErrorMessage(invalidBlock)).toContain('屏蔽')
  })
})
