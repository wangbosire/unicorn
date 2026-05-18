import { describe, expect, it } from 'vitest'
import {
  formatMemberTransferMode,
  formatMemberTransferStatus,
  formatMemberTransferTimestamp,
} from '../../src/lib/member-transfers'

describe('member-transfers helpers', () => {
  it('formats transfer labels and timestamps', () => {
    expect(formatMemberTransferMode('DIRECT_MEMBER')).toContain('指定会员')
    expect(formatMemberTransferStatus('PENDING_ACCEPT')).toContain('待接收')
    expect(formatMemberTransferTimestamp(null)).toBe('—')
    expect(formatMemberTransferTimestamp(1716022800000)).not.toBe('')
  })
})
