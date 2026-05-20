import { describe, expect, it } from 'vitest'
import { canAccessIssuanceArea, canSeeNavItem } from '@/lib/nav-permissions'

describe('nav-permissions', () => {
  it('hides nav item when required read permission is missing', () => {
    expect(canSeeNavItem(['collection_comments.manage'], ['collection_comments.read'])).toBe(
      false
    )
  })

  it('shows nav item when matching read permission exists', () => {
    expect(canSeeNavItem(['collection_comments.read'], ['collection_comments.read'])).toBe(
      true
    )
  })

  it('shows nav item when wildcard permission exists', () => {
    expect(canSeeNavItem(['*'], ['collection_reviews.read'])).toBe(true)
  })

  it('allows issuance area when any issuance read permission exists', () => {
    expect(canAccessIssuanceArea(['issuance.batches'])).toBe(true)
  })

  it('rejects issuance area when unrelated permissions are present', () => {
    expect(canAccessIssuanceArea(['collections.read'])).toBe(false)
  })
})
