import { describe, expect, it } from 'vitest'
import {
  buildCommentSubmissionMessage,
  formatCommentPublishedAt,
} from '../../src/lib/collection-comments'

describe('collection-comments helpers', () => {
  it('formats published time and falls back safely', () => {
    expect(formatCommentPublishedAt('2026-05-18T12:00:00.000Z')).not.toBe('')
    expect(formatCommentPublishedAt('not-a-date')).toBe('not-a-date')
  })

  it('maps submission status to user-facing message', () => {
    expect(buildCommentSubmissionMessage('MACHINE_APPROVED', 'comment')).toContain('已发布')
    expect(buildCommentSubmissionMessage('PENDING_MANUAL', 'reply')).toContain('待人工审核')
    expect(buildCommentSubmissionMessage('MACHINE_REJECTED', 'comment')).toContain('未通过')
  })
})
