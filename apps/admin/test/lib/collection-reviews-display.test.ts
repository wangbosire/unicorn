import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api-error'
import {
  buildCollectionReviewsQueryParams,
  formatReviewSource,
  formatReviewStage,
  formatReviewStatus,
  formatSubmittedAt,
  mapApproveReviewErrorMessage,
  mapCollectionReviewHistoryErrorMessage,
  mapListCollectionReviewsErrorMessage,
  mapRejectReviewErrorMessage,
  mapTakedownPublishErrorMessage,
  REVIEW_STATUS_FILTER_ALL,
  REVIEW_STATUS_OPTIONS,
  rowMayTakedownPublish,
} from '@/lib/collection-reviews-display'

describe('collection-reviews-display', () => {
  it('exposes the all-status filter option first', () => {
    expect(REVIEW_STATUS_OPTIONS[0]).toEqual({
      value: REVIEW_STATUS_FILTER_ALL,
      label: '全部状态',
    })
  })

  it('formats known review source, stage, and status labels', () => {
    expect(formatReviewSource('SYSTEM')).toBe('系统')
    expect(formatReviewStage('MANUAL')).toBe('人工')
    expect(formatReviewStatus('PENDING_MANUAL')).toBe('待人工复核')
  })

  it('falls back to raw labels for unknown source, stage, and status', () => {
    expect(formatReviewSource('ROBOT')).toBe('ROBOT')
    expect(formatReviewStage('UNKNOWN')).toBe('UNKNOWN')
    expect(formatReviewStatus('UNKNOWN')).toBe('UNKNOWN')
  })

  it('allows takedown only for approved machine/manual rows', () => {
    expect(
      rowMayTakedownPublish({
        reviewId: '1',
        collectionId: 'col_1',
        collectionNo: 'COL-1',
        contentVersionId: 'ccv_1',
        versionNo: 1,
        reviewStage: 'MACHINE',
        reviewStatus: 'MACHINE_APPROVED',
        reviewReason: null,
        submittedAt: 0,
      })
    ).toBe(true)

    expect(
      rowMayTakedownPublish({
        reviewId: '2',
        collectionId: 'col_1',
        collectionNo: 'COL-1',
        contentVersionId: 'ccv_1',
        versionNo: 1,
        reviewStage: 'MANUAL',
        reviewStatus: 'PENDING_MANUAL',
        reviewReason: null,
        submittedAt: 0,
      })
    ).toBe(false)
  })

  it('builds collection review query params with trimmed collection number', () => {
    expect(
      buildCollectionReviewsQueryParams({
        page: 2,
        pageSize: 20,
        reviewStatus: 'PENDING_MANUAL',
        collectionNoFilter: '  COL-001  ',
      })
    ).toEqual({
      page: 2,
      pageSize: 20,
      reviewStatus: 'PENDING_MANUAL',
      collectionNo: 'COL-001',
    })
  })

  it('omits review status and collection number when filters are empty/default', () => {
    expect(
      buildCollectionReviewsQueryParams({
        page: 1,
        pageSize: 20,
        reviewStatus: REVIEW_STATUS_FILTER_ALL,
        collectionNoFilter: '   ',
      })
    ).toEqual({
      page: 1,
      pageSize: 20,
    })
  })

  it('maps approve/reject/takedown errors to operator-friendly copy', () => {
    expect(
      mapApproveReviewErrorMessage(
        new ApiError({
          code: 'REVIEW_STATUS_INVALID',
          message: 'review status invalid',
        })
      )
    ).toContain('待人工复核')

    expect(
      mapRejectReviewErrorMessage(
        new ApiError({
          code: 'REVIEW_RECORD_NOT_FOUND',
          message: 'review record not found',
        })
      )
    ).toBe('审核记录不存在或已删除')

    expect(
      mapTakedownPublishErrorMessage(
        new ApiError({
          code: 'TAKEDOWN_STATUS_INVALID',
          message: 'content version is already taken down',
        })
      )
    ).toBe('该版本已处于下架状态')
  })

  it('maps list/history loading errors to readable messages', () => {
    expect(
      mapListCollectionReviewsErrorMessage(
        new ApiError({
          code: 'ADMIN_AUTH_FORBIDDEN',
          message: 'forbidden',
        })
      )
    ).toContain('内容复核')

    expect(
      mapCollectionReviewHistoryErrorMessage(
        new ApiError({
          code: 'REVIEW_HISTORY_LIMIT_EXCEEDED',
          message: 'too many records',
        })
      )
    ).toContain('审核记录过多')
  })

  it('falls back to generic loading errors for unknown failures', () => {
    expect(mapListCollectionReviewsErrorMessage(new Error('network'))).toBe(
      '审核记录加载失败，请检查网络后重试。'
    )
    expect(mapCollectionReviewHistoryErrorMessage(new Error('network'))).toBe(
      '审核历史加载失败，请检查网络后重试。'
    )
  })

  it('formats timestamps and falls back to raw value when formatter throws', () => {
    expect(typeof formatSubmittedAt(0)).toBe('string')

    const formatterSpy = vi
      .spyOn(Intl, 'DateTimeFormat')
      .mockImplementation(() => {
        throw new Error('boom')
      })

    expect(formatSubmittedAt(1234)).toBe('1234')

    formatterSpy.mockRestore()
  })
})
