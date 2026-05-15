import { describe, expect, it } from 'vitest'
import { formatPublicApiErrorMessage } from '../../src/lib/public-api-errors'

describe('formatPublicApiErrorMessage', () => {
  it('maps NOT_FOUND', () => {
    expect(
      formatPublicApiErrorMessage({ code: 'NOT_FOUND', message: 'x' })
    ).toContain('未公开')
  })

  it('falls back to message', () => {
    expect(formatPublicApiErrorMessage({ code: 'OTHER', message: 'raw' })).toBe('raw')
  })
})
