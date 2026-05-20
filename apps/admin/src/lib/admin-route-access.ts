import { redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'

/**
 * 后台权限点常量：与后端 `permissions.permission_key` 保持一致。
 */
export const ADMIN_PERMISSION_ADMIN_USERS_READ = 'admin_users.read'
export const ADMIN_PERMISSION_ADMIN_USERS_ASSIGN_ROLES =
  'admin_users.assign_roles'
export const ADMIN_PERMISSION_ROLES_READ = 'roles.read'
export const ADMIN_PERMISSION_ROLES_ASSIGN_PERMISSIONS =
  'roles.assign_permissions'
export const ADMIN_PERMISSION_PERMISSIONS_READ = 'permissions.read'
export const ADMIN_PERMISSION_PERMISSION_GROUPS_READ =
  'permission_groups.read'
export const ADMIN_PERMISSION_PERMISSION_GROUPS_UPDATE =
  'permission_groups.update'
export const ADMIN_PERMISSION_MENUS_READ = 'menus.read'
export const ADMIN_PERMISSION_MENUS_UPDATE = 'menus.update'
export const ADMIN_PERMISSION_WILDCARD = '*'
export const ADMIN_PERMISSION_DASHBOARD_READ = 'dashboard.read'
export const ADMIN_PERMISSION_ISSUANCE_SERIES = 'issuance.series'
export const ADMIN_PERMISSION_ISSUANCE_SERIES_CREATE =
  'issuance.series.create'
export const ADMIN_PERMISSION_ISSUANCE_SERIES_UPDATE =
  'issuance.series.update'
export const ADMIN_PERMISSION_ISSUANCE_SERIES_TOGGLE_STATUS =
  'issuance.series.toggle_status'
export const ADMIN_PERMISSION_ISSUANCE_BATCHES = 'issuance.batches'
export const ADMIN_PERMISSION_ISSUANCE_BATCHES_CREATE =
  'issuance.batches.create'
export const ADMIN_PERMISSION_ISSUANCE_BATCHES_UPDATE =
  'issuance.batches.update'
export const ADMIN_PERMISSION_ISSUANCE_BATCHES_TOGGLE_STATUS =
  'issuance.batches.toggle_status'
export const ADMIN_PERMISSION_ISSUANCE_ACTIVATION_CODES =
  'issuance.activation_codes'
export const ADMIN_PERMISSION_ISSUANCE_ACTIVATION_CODES_GENERATE =
  'issuance.activation_codes.generate'
export const ADMIN_PERMISSION_ISSUANCE_ACTIVATION_CODES_VOID =
  'issuance.activation_codes.void'
export const ADMIN_PERMISSION_COLLECTIONS_READ = 'collections.read'
export const ADMIN_PERMISSION_COLLECTIONS_TOGGLE_STATUS =
  'collections.toggle_status'
export const ADMIN_PERMISSION_COLLECTION_REVIEWS_READ =
  'collection_reviews.read'
export const ADMIN_PERMISSION_COLLECTION_REVIEWS_APPROVE =
  'collection_reviews.approve'
export const ADMIN_PERMISSION_COLLECTION_REVIEWS_REJECT =
  'collection_reviews.reject'
export const ADMIN_PERMISSION_COLLECTION_REVIEWS_TAKEDOWN =
  'collection_reviews.takedown'
export const ADMIN_PERMISSION_COLLECTION_COMMENTS_READ =
  'collection_comments.read'
export const ADMIN_PERMISSION_COLLECTION_COMMENTS_APPROVE =
  'collection_comments.approve'
export const ADMIN_PERMISSION_COLLECTION_COMMENTS_REJECT =
  'collection_comments.reject'
export const ADMIN_PERMISSION_COLLECTION_COMMENTS_BLOCK =
  'collection_comments.block'
export const ADMIN_PERMISSION_NOTIFICATIONS_READ = 'notifications.read'
export const ADMIN_PERMISSION_NOTIFICATIONS_TEMPLATE_CREATE =
  'notifications.template.create'
export const ADMIN_PERMISSION_NOTIFICATIONS_TEMPLATE_UPDATE =
  'notifications.template.update'
export const ADMIN_PERMISSION_NOTIFICATIONS_TEMPLATE_TOGGLE_STATUS =
  'notifications.template.toggle_status'
export const ADMIN_PERMISSION_NOTIFICATIONS_DISPATCH_RETRY =
  'notifications.dispatch.retry'
export const ADMIN_PERMISSION_TRANSFERS_READ = 'transfers.read'
export const ADMIN_PERMISSION_TRANSFERS_COMPLETE = 'transfers.complete'
export const ADMIN_PERMISSION_TRANSFERS_ROLLBACK = 'transfers.rollback'
export const ADMIN_PERMISSION_TRANSFERS_EXPIRE = 'transfers.expire'
export const ADMIN_PERMISSION_TRANSFERS_SYNC_OWNER = 'transfers.sync_owner'
export const ADMIN_PERMISSION_MEMBERS_READ = 'members.read'
export const ADMIN_PERMISSION_MEMBERS_FREEZE = 'members.freeze'
export const ADMIN_PERMISSION_MEMBERS_UNFREEZE = 'members.unfreeze'

/**
 * 判断是否具备单个后台权限点；`*` 视为全量命中。
 */
export function hasAdminPermission(
  permissionKeys: readonly string[] | undefined,
  permissionKey: string
): boolean {
  if (!permissionKeys || permissionKeys.length === 0) {
    return false
  }
  if (permissionKeys.includes(ADMIN_PERMISSION_WILDCARD)) {
    return true
  }
  return permissionKeys.includes(permissionKey)
}

/**
 * 判断是否命中任一后台权限点。
 */
export function hasAnyAdminPermission(
  permissionKeys: readonly string[] | undefined,
  permissionKeysToCheck: readonly string[]
): boolean {
  if (permissionKeysToCheck.length === 0) {
    return true
  }
  return permissionKeysToCheck.some((permissionKey) =>
    hasAdminPermission(permissionKeys, permissionKey)
  )
}

/**
 * 判断是否同时满足全部后台权限点。
 */
export function hasAllAdminPermissions(
  permissionKeys: readonly string[] | undefined,
  permissionKeysToCheck: readonly string[]
): boolean {
  if (permissionKeysToCheck.length === 0) {
    return true
  }
  return permissionKeysToCheck.every((permissionKey) =>
    hasAdminPermission(permissionKeys, permissionKey)
  )
}

/**
 * 后台路由守卫：缺少目标 action 权限时统一跳转 403。
 */
export function enforceAdminRouteAccess(options: {
  anyOfPermissions?: readonly string[]
  allOfPermissions?: readonly string[]
}) {
  const permissionKeys = useAuthStore.getState().auth.user?.permissionKeys ?? []

  if (
    !hasAnyAdminPermission(permissionKeys, options.anyOfPermissions ?? []) ||
    !hasAllAdminPermissions(permissionKeys, options.allOfPermissions ?? [])
  ) {
    throw redirect({ to: '/403' })
  }
}
