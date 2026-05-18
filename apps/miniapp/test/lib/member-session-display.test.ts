import { describe, expect, it } from 'vitest'
import { formatSessionSourceLabel } from '../../src/lib/member-session-display'

describe('formatSessionSourceLabel', () => {
  it('maps session sources', () => {
    expect(formatSessionSourceLabel('anonymous')).toContain('未登录')
    expect(formatSessionSourceLabel('token')).toContain('accessToken')
  })
})
