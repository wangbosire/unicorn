import type { Request } from 'express';

/**
 * 挂载在请求上的后台用户上下文。
 */
export type AdminRequestContext = {
  id: string
  username: string
  accountNo: string
  permissionKeys: string[]
}

/**
 * 携带后台鉴权上下文的 HTTP 请求。
 */
export type AdminHttpRequest = Request & {
  admin?: AdminRequestContext
}
