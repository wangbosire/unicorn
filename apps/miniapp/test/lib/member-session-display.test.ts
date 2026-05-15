import { describe, expect, it } from 'vitest'
import { DEFAULT_DEV_MEMBER_ID } from '../../src/lib/default-dev-member'
import { formatSessionSourceLabel } from '../../src/lib/member-session-display'

describe('formatSessionSourceLabel', () => {
  it('maps session sources', () => {
    expect(formatSessionSourceLabel('default')).toContain(DEFAULT_DEV_MEMBER_ID)
    expect(formatSessionSourceLabel('token')).toContain('accessToken')
    expect(formatSessionSourceLabel('id_only')).toContain('memberId')
  })
})
