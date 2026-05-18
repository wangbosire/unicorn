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

  it('maps comment-related business errors', () => {
    expect(
      formatMemberApiErrorMessage({
        code: 'COMMENT_NOT_REPLYABLE',
        message: 'comment is not replyable',
      })
    ).toContain('回复')

    expect(
      formatMemberApiErrorMessage({
        code: 'MEMBER_ACCOUNT_FROZEN',
        message: 'member account frozen',
      })
    ).toContain('冻结')
  })

  it('maps message and transfer business errors', () => {
    expect(
      formatMemberApiErrorMessage({
        code: 'MESSAGE_NOT_FOUND',
        message: 'message not found',
      })
    ).toContain('消息')

    expect(
      formatMemberApiErrorMessage({
        code: 'TRANSFER_EXPIRED',
        message: 'transfer expired',
      })
    ).toContain('过期')
  })
})
