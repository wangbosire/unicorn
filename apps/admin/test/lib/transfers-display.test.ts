import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api-error'
import {
  buildTransferOrdersQueryParams,
  formatTransferMode,
  formatTransferReceiver,
  formatTransferStatus,
  mapListTransferOrdersErrorMessage,
  TRANSFER_MODE_FILTER_ALL,
  TRANSFER_STATUS_FILTER_ALL,
} from '@/lib/transfers-display'

describe('transfers-display', () => {
  it('formats transfer labels and receiver fallback', () => {
    expect(formatTransferStatus('PENDING_ACCEPT')).toBe('待接收')
    expect(formatTransferMode('TRANSFER_CODE')).toBe('转让码')
    expect(
      formatTransferReceiver({
        toMemberNo: null,
        toMemberNickname: null,
        transferMode: 'TRANSFER_CODE',
      })
    ).toBe('待转让码接收')
    expect(
      formatTransferReceiver({
        toMemberNo: 'MEM-0002',
        toMemberNickname: '接收会员',
        transferMode: 'DIRECT_MEMBER',
      })
    ).toContain('MEM-0002')
  })

  it('builds query params without all placeholders', () => {
    expect(
      buildTransferOrdersQueryParams({
        page: 2,
        pageSize: 20,
        collectionNoFilter: ' COL-0001 ',
        status: TRANSFER_STATUS_FILTER_ALL,
        transferMode: TRANSFER_MODE_FILTER_ALL,
      })
    ).toEqual({
      page: '2',
      pageSize: '20',
      collectionNo: 'COL-0001',
    })
  })

  it('maps backend errors to operator-friendly copy', () => {
    const invalidMode = new ApiError({
      code: 'INVALID_COLLECTION_TRANSFER_MODE',
      message: 'invalid',
    })
    expect(mapListTransferOrdersErrorMessage(invalidMode)).toContain('转让方式')

    const forbidden = new ApiError({
      code: 'ADMIN_AUTH_FORBIDDEN',
      message: 'forbidden',
    })
    expect(mapListTransferOrdersErrorMessage(forbidden)).toContain('转让记录')
  })
})
