import { describe, expect, it } from 'vitest'
import type { CollectionReviewListItem } from '@contracts/admin/collection-reviews'
import { buildCollectionReviewsCsv, escapeCsvField } from '@/lib/collection-reviews-csv'

describe('escapeCsvField', () => {
  it('wraps fields that contain commas', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"')
  })

  it('doubles internal quotes', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""')
  })
})

describe('buildCollectionReviewsCsv', () => {
  it('includes header and one data row', () => {
    const row: CollectionReviewListItem = {
      reviewId: 'crr_1',
      collectionId: 'col_1',
      collectionNo: 'COL-001',
      seriesId: 'ser_1',
      seriesNo: 'SER-001',
      seriesName: '星辉远征',
      batchId: 'bat_1',
      batchNo: 'BAT-001',
      batchName: '第一批',
      ownerMemberNo: 'MBR-001',
      ownerMemberNickname: '测试会员',
      contentVersionId: 'ccv_1',
      versionNo: 2,
      title: '星辉远征第一版',
      reviewStage: 'MANUAL',
      reviewStatus: 'PENDING_MANUAL',
      editStatus: 'SUBMITTED',
      publishStatus: 'PUBLISHED',
      reviewReason: 'note, with comma',
      submittedAt: 0,
    }
    const csv = buildCollectionReviewsCsv([row])
    expect(csv.startsWith('审核记录ID,')).toBe(true)
    expect(csv).toContain('crr_1')
    expect(csv).toContain('"note, with comma"')
    expect(csv).toContain('1970-01-01T00:00:00.000Z')
  })
})
