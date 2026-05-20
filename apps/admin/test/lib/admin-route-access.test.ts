import { beforeEach, describe, expect, it } from 'vitest'
import {
  ADMIN_PERMISSION_COLLECTION_COMMENTS_BLOCK,
  ADMIN_PERMISSION_COLLECTION_COMMENTS_READ,
  ADMIN_PERMISSION_COLLECTION_REVIEWS_READ,
  ADMIN_PERMISSION_MEMBERS_FREEZE,
  ADMIN_PERMISSION_WILDCARD,
  enforceAdminRouteAccess,
  hasAdminPermission,
  hasAnyAdminPermission,
} from '@/lib/admin-route-access'
import { useAuthStore } from '@/stores/auth-store'
import { clearCookies } from '@/test-utils/cookies'

describe('admin-route-access', () => {
  const sampleUser = {
    id: 'u1',
    accountNo: 'ADM000001',
    username: 'admin',
    displayName: '管理员',
    roles: ['ops'],
    permissionKeys: [] as string[],
  }

  beforeEach(() => {
    clearCookies()
    useAuthStore.getState().auth.reset()
  })

  it('matches exact permission key', () => {
    expect(
      hasAdminPermission(['members.freeze'], ADMIN_PERMISSION_MEMBERS_FREEZE)
    ).toBe(true)
  })

  it('treats wildcard as full access', () => {
    expect(
      hasAdminPermission(
        [ADMIN_PERMISSION_WILDCARD],
        ADMIN_PERMISSION_MEMBERS_FREEZE
      )
    ).toBe(true)
  })

  it('does not treat removed manage key as freeze permission', () => {
    expect(
      hasAnyAdminPermission(['members.manage'], [ADMIN_PERMISSION_MEMBERS_FREEZE])
    ).toBe(false)
  })

  it('does not treat removed review manage key as review read permission', () => {
    expect(
      hasAnyAdminPermission(
        ['collection_reviews.manage'],
        [ADMIN_PERMISSION_COLLECTION_REVIEWS_READ]
      )
    ).toBe(false)
  })

  it('does not treat removed comment manage key as comment block permission', () => {
    expect(
      hasAnyAdminPermission(
        ['collection_comments.manage'],
        [ADMIN_PERMISSION_COLLECTION_COMMENTS_BLOCK]
      )
    ).toBe(false)
  })

  it('enforces route access when matching read permission exists', () => {
    useAuthStore.getState().auth.setUser({
      ...sampleUser,
      permissionKeys: [ADMIN_PERMISSION_COLLECTION_COMMENTS_READ],
    })

    expect(() =>
      enforceAdminRouteAccess({
        anyOfPermissions: [ADMIN_PERMISSION_COLLECTION_COMMENTS_READ],
      })
    ).not.toThrow()
  })

  it('redirects to 403 when only removed manage permission exists', () => {
    useAuthStore.getState().auth.setUser({
      ...sampleUser,
      permissionKeys: ['collection_comments.manage'],
    })

    try {
      enforceAdminRouteAccess({
        anyOfPermissions: [ADMIN_PERMISSION_COLLECTION_COMMENTS_READ],
      })
      throw new Error('expected redirect')
    } catch (error) {
      expect(error).toMatchObject({
        options: {
          to: '/403',
        },
      })
    }
  })
})
