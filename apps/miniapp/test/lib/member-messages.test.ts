import { describe, expect, it } from 'vitest'
import {
  formatMemberMessageTimestamp,
  formatMemberMessageType,
} from '../../src/lib/member-messages'

describe('member-messages helpers', () => {
  it('formats message type and timestamp', () => {
    expect(formatMemberMessageType('ACTIVATE_SUCCESS')).toContain('激活')
    expect(formatMemberMessageType('UNKNOWN_TYPE')).toBe('UNKNOWN_TYPE')
    expect(formatMemberMessageTimestamp(1716022800000)).not.toBe('')
  })
})
