import { redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { canAccessIssuanceArea } from '@/lib/nav-permissions'

/**
 * 发行管理子路由守卫：无任一发行权限时跳转 403。
 */
export function enforceIssuanceRouteAccess() {
  const keys = useAuthStore.getState().auth.user?.permissionKeys ?? []
  if (!canAccessIssuanceArea(keys)) {
    throw redirect({ to: '/403' })
  }
}
