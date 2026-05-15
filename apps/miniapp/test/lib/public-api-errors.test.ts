import { describe, expect, it } from 'vitest'
import { formatPublicApiErrorMessage } from '../../src/lib/public-api-errors'

describe('formatPublicApiErrorMessage', () => {
  it('maps PUBLIC_COLLECTION_TAKEDOWN', () => {
    expect(
      formatPublicApiErrorMessage({
        code: 'PUBLIC_COLLECTION_TAKEDOWN',
        message: 'public collection is taken down',
      }),
    ).toContain('下架')
  })

  it('maps NOT_FOUND', () => {
    expect(
      formatPublicApiErrorMessage({ code: 'NOT_FOUND', message: 'x' })
    ).toContain('未公开')
  })

  it('falls back to message', () => {
    expect(formatPublicApiErrorMessage({ code: 'OTHER', message: 'raw' })).toBe('raw')
  })
})
