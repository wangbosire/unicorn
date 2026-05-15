import { describe, expect, it } from 'vitest'
import { buildContentPayload, readTextFromPayload } from '../../src/lib/collection-content-draft'

describe('collection-content-draft', () => {
  it('readTextFromPayload reads string keys', () => {
    expect(readTextFromPayload({ title: 'a' }, 'title')).toBe('a')
    expect(readTextFromPayload(undefined, 'title')).toBe('')
    expect(readTextFromPayload({ title: 1 }, 'title')).toBe('')
  })

  it('buildContentPayload trims and includes blocks', () => {
    const p = buildContentPayload('  T ', '  S ', '')
    expect(p.title).toBe('T')
    expect(p.summary).toBe('S')
    expect(p.coverImageUrl).toBeUndefined()
    expect(p.blocks).toEqual([
      { type: 'paragraph', text: 'T' },
      { type: 'paragraph', text: 'S' },
    ])
  })
})
