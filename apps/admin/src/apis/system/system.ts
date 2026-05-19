import type {
  AdminMenuDetail,
  AdminPermissionGroupDetail,
  AdminRoleDetail,
  AdminUserDetail,
  ListAdminUsersQuery,
  ListAdminUsersResponseData,
  ListMenusQuery,
  ListMenusResponseData,
  ListPermissionGroupsQuery,
  ListPermissionGroupsResponseData,
  ListRolesQuery,
  ListRolesResponseData,
  UpdateAdminUserRolesRequest,
  UpdateAdminUserRolesResponseData,
  UpdateMenuPermissionGroupsRequest,
  UpdateMenuPermissionGroupsResponseData,
  UpdateRolePermissionsRequest,
  UpdateRolePermissionsResponseData,
} from '@contracts/admin/system'
import { apiClient } from '@/lib/api-client'

/**
 * 查询后台用户列表。
 */
export async function listAdminUsers(
  query: ListAdminUsersQuery
): Promise<ListAdminUsersResponseData> {
  return apiClient.get('/admin-api/system/admin-users', { params: query })
}

/**
 * 查询后台用户详情。
 */
export async function getAdminUser(adminUserId: string): Promise<AdminUserDetail> {
  const id = encodeURIComponent(adminUserId.trim())
  return apiClient.get(`/admin-api/system/admin-users/${id}`)
}

/**
 * 保存后台用户角色分配。
 */
export async function updateAdminUserRoles(
  adminUserId: string,
  payload: UpdateAdminUserRolesRequest
): Promise<UpdateAdminUserRolesResponseData> {
  const id = encodeURIComponent(adminUserId.trim())
  return apiClient.patch(`/admin-api/system/admin-users/${id}/roles`, payload)
}

/**
 * 查询角色列表。
 */
export async function listRoles(
  query: ListRolesQuery
): Promise<ListRolesResponseData> {
  return apiClient.get('/admin-api/system/roles', { params: query })
}

/**
 * 查询角色详情。
 */
export async function getRole(roleId: string): Promise<AdminRoleDetail> {
  const id = encodeURIComponent(roleId.trim())
  return apiClient.get(`/admin-api/system/roles/${id}`)
}

/**
 * 保存角色权限。
 */
export async function updateRolePermissions(
  roleId: string,
  payload: UpdateRolePermissionsRequest
): Promise<UpdateRolePermissionsResponseData> {
  const id = encodeURIComponent(roleId.trim())
  return apiClient.patch(`/admin-api/system/roles/${id}/permissions`, payload)
}

/**
 * 查询权限组列表。
 */
export async function listPermissionGroups(
  query: ListPermissionGroupsQuery
): Promise<ListPermissionGroupsResponseData> {
  return apiClient.get('/admin-api/system/permission-groups', { params: query })
}

/**
 * 查询权限组详情。
 */
export async function getPermissionGroup(
  permissionGroupId: string
): Promise<AdminPermissionGroupDetail> {
  const id = encodeURIComponent(permissionGroupId.trim())
  return apiClient.get(`/admin-api/system/permission-groups/${id}`)
}

/**
 * 查询菜单列表。
 */
export async function listMenus(
  query: ListMenusQuery
): Promise<ListMenusResponseData> {
  return apiClient.get('/admin-api/system/menus', { params: query })
}

/**
 * 查询菜单详情。
 */
export async function getMenu(menuId: string): Promise<AdminMenuDetail> {
  const id = encodeURIComponent(menuId.trim())
  return apiClient.get(`/admin-api/system/menus/${id}`)
}

/**
 * 保存菜单与权限组绑定。
 */
export async function updateMenuPermissionGroups(
  menuId: string,
  payload: UpdateMenuPermissionGroupsRequest
): Promise<UpdateMenuPermissionGroupsResponseData> {
  const id = encodeURIComponent(menuId.trim())
  return apiClient.patch(`/admin-api/system/menus/${id}/permission-groups`, payload)
}
