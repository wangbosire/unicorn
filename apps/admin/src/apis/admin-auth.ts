import type {
  AdminGetNavigationResponseData,
  AdminGetMeResponseData,
  AdminLoginRequest,
  AdminLoginResponseData,
} from '@contracts/admin/auth'
import { apiClient } from '@/lib/api-client'

/**
 * 后台用户名密码登录。
 */
export async function loginAdmin(
  payload: AdminLoginRequest
): Promise<AdminLoginResponseData> {
  return apiClient.post('/admin-api/auth/login', payload)
}

/**
 * 获取当前登录后台用户（含权限点，用于菜单裁剪与路由守卫）。
 */
export async function getCurrentAdmin(): Promise<AdminGetMeResponseData> {
  return apiClient.get('/admin-api/auth/me')
}

/**
 * 获取当前登录后台用户的可见导航菜单。
 */
export async function getAdminNavigation(): Promise<AdminGetNavigationResponseData> {
  return apiClient.get('/admin-api/auth/navigation')
}
