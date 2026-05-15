/**
 * 将公开展示等 `public-api` 请求错误映射为可读中文（未知码回落为原始 message）。
 */
export function formatPublicApiErrorMessage(error: { code: string; message: string }): string {
  switch (error.code) {
    case 'NOT_FOUND':
      return '该藏品未公开或不存在'
    case 'INVALID_RESPONSE':
      return '接口响应异常，请检查网络或基地址配置'
    case 'HTTP_ERROR':
      return error.message
    default:
      return error.message
  }
}
