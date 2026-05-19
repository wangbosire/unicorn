import type { ReactNode } from 'react'
import { useAdminPermission } from '@/hooks/use-admin-permission'

type AdminPermissionGuardProps = {
  anyOfPermissions?: readonly string[]
  allOfPermissions?: readonly string[]
  fallback?: ReactNode
  children: ReactNode
}

/**
 * 页面内权限守卫：常用于按钮区块、批量操作入口和只读/可编辑分支切换。
 */
export function AdminPermissionGuard(props: AdminPermissionGuardProps) {
  const { hasAllPermissions, hasAnyPermissions } = useAdminPermission()

  const canAccess =
    hasAnyPermissions(props.anyOfPermissions ?? []) &&
    hasAllPermissions(props.allOfPermissions ?? [])

  if (!canAccess) {
    return <>{props.fallback ?? null}</>
  }

  return <>{props.children}</>
}

