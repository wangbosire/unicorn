import { describe, expect, it } from 'vitest'
import { formatMemberApiErrorMessage } from '../../src/lib/member-api-errors'

describe('formatMemberApiErrorMessage', () => {
  it('maps known codes to Chinese', () => {
    expect(
      formatMemberApiErrorMessage({
        code: 'COLLECTION_NOT_EDITABLE',
        message: 'collection content is under review',
      })
    ).toContain('审核')
  })

  it('falls back to message for unknown codes', () => {
    expect(
      formatMemberApiErrorMessage({ code: 'CUSTOM', message: 'hello' })
    ).toBe('hello')
  })
})
