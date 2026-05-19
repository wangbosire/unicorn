import {
  hasAdminPermission,
  hasAllAdminPermissions,
  hasAnyAdminPermission,
} from '@/lib/admin-route-access'
import { useAuthStore } from '@/stores/auth-store'

/**
 * 当前登录后台用户的权限判定能力。
 * 用于页面内按钮隐藏、只读态控制和局部功能开关。
 */
export function useAdminPermission() {
  const permissionKeys = useAuthStore((state) => state.auth.user?.permissionKeys)

  return {
    permissionKeys: permissionKeys ?? [],
    hasPermission: (permissionKey: string) =>
      hasAdminPermission(permissionKeys, permissionKey),
    hasAnyPermissions: (permissionKeysToCheck: readonly string[]) =>
      hasAnyAdminPermission(permissionKeys, permissionKeysToCheck),
    hasAllPermissions: (permissionKeysToCheck: readonly string[]) =>
      hasAllAdminPermissions(permissionKeys, permissionKeysToCheck),
  }
}

