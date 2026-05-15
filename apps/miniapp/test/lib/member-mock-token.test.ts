import { describe, expect, it } from 'vitest'
import {
  MOCK_MEMBER_TOKEN_PREFIX,
  parseMemberIdFromMockAccessToken,
} from '../../src/lib/member-mock-token'

describe('parseMemberIdFromMockAccessToken', () => {
  it('returns null for empty or non-mock tokens', () => {
    expect(parseMemberIdFromMockAccessToken('')).toBeNull()
    expect(parseMemberIdFromMockAccessToken('   ')).toBeNull()
    expect(parseMemberIdFromMockAccessToken('jwt-like.token.here')).toBeNull()
  })

  it('returns null when mock prefix is present but id is empty', () => {
    expect(parseMemberIdFromMockAccessToken(MOCK_MEMBER_TOKEN_PREFIX)).toBeNull()
    expect(parseMemberIdFromMockAccessToken(`${MOCK_MEMBER_TOKEN_PREFIX}  `)).toBeNull()
  })

  it('parses raw mock token', () => {
    expect(parseMemberIdFromMockAccessToken(`${MOCK_MEMBER_TOKEN_PREFIX}user-42`)).toBe(
      'user-42'
    )
  })

  it('parses Bearer-prefixed mock token', () => {
    expect(
      parseMemberIdFromMockAccessToken(`Bearer ${MOCK_MEMBER_TOKEN_PREFIX}user-42`)
    ).toBe('user-42')
    expect(
      parseMemberIdFromMockAccessToken(`  bearer ${MOCK_MEMBER_TOKEN_PREFIX}x  `)
    ).toBeNull()
  })

  it('trims member id segment', () => {
    expect(parseMemberIdFromMockAccessToken(`${MOCK_MEMBER_TOKEN_PREFIX}  abc  `)).toBe(
      'abc'
    )
  })
})
