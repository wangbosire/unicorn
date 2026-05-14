import { SetMetadata } from '@nestjs/common';

export const ADMIN_REQUIRED_PERMISSIONS_KEY = 'admin_required_permissions';

/**
 * 声明当前接口需要的权限点；调用方须同时拥有列表中的全部权限（或持有 `*`）。
 */
export const RequireAdminPermissions = (...permissionKeys: string[]) =>
  SetMetadata(ADMIN_REQUIRED_PERMISSIONS_KEY, permissionKeys);
