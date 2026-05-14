/**
 * 侧边栏与路由权限辅助：与后端 `permissions.permission_key` 对齐。
 */

/**
 * 是否可展示需要任意命中 `anyOfPermissions` 的导航项。
 * `anyOf` 为空或未定义时，登录即可见。
 */
export function canSeeNavItem(
  permissionKeys: readonly string[] | undefined,
  anyOfPermissions?: readonly string[]
): boolean {
  if (!anyOfPermissions || anyOfPermissions.length === 0) {
    return true
  }
  if (!permissionKeys || permissionKeys.length === 0) {
    return false
  }
  if (permissionKeys.includes('*')) {
    return true
  }
  return anyOfPermissions.some((p) => permissionKeys.includes(p))
}

/** 发行管理子域：至少具备其一即可进入 /issuance 布局。 */
export function canAccessIssuanceArea(
  permissionKeys: readonly string[]
): boolean {
  if (permissionKeys.includes('*')) {
    return true
  }
  const issuanceKeys = [
    'issuance.series',
    'issuance.batches',
    'issuance.activation_codes',
  ] as const
  return issuanceKeys.some((k) => permissionKeys.includes(k))
}
