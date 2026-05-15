import { describe, expect, it } from 'vitest'
import {
  extractParagraphTextsFromPayload,
  filterParagraphsDedupedAgainstTitleSummary,
} from '../../src/lib/public-collection-content'

describe('public-collection-content', () => {
  it('extracts paragraph texts', () => {
    expect(
      extractParagraphTextsFromPayload({
        blocks: [
          { type: 'paragraph', text: '  a  ' },
          { type: 'heading', text: 'x' },
          { type: 'paragraph', text: 'b' },
        ],
      })
    ).toEqual(['a', 'b'])
  })

  it('returns empty for invalid payload', () => {
    expect(extractParagraphTextsFromPayload(undefined)).toEqual([])
    expect(extractParagraphTextsFromPayload({})).toEqual([])
    expect(extractParagraphTextsFromPayload({ blocks: 'no' })).toEqual([])
  })

  it('dedupes paragraphs matching title or summary', () => {
    expect(
      filterParagraphsDedupedAgainstTitleSummary(['T', 'extra', 'S'], 'T', 'S')
    ).toEqual(['extra'])
  })

  it('dedupes using trimmed title and summary', () => {
    expect(filterParagraphsDedupedAgainstTitleSummary(['Hi', 'body'], '  Hi  ', ' sum ')).toEqual(['body'])
  })

  it('returns unchanged when no overlap', () => {
    expect(filterParagraphsDedupedAgainstTitleSummary(['a', 'b'], 'T', 'S')).toEqual(['a', 'b'])
  })

  it('handles empty paragraph list', () => {
    expect(filterParagraphsDedupedAgainstTitleSummary([], 'T', 'S')).toEqual([])
  })
})
