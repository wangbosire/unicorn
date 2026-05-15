/**
 * 将会员接口业务错误码映射为小程序端可读中文（未知码回落为原始 message）。
 */
export function formatMemberApiErrorMessage(error: { code: string; message: string }): string {
  switch (error.code) {
    case 'COLLECTION_NOT_EDITABLE':
      return '当前内容审核中，暂不可保存草稿'
    case 'CONTENT_VERSION_ALREADY_SUBMITTED':
      return '该版本已提交或当前不可再次提交'
    case 'CONTENT_VERSION_NOT_FOUND':
      return '内容版本不存在或已失效'
    case 'COLLECTION_NOT_OWNED_BY_MEMBER':
      return '该藏品不属于当前会员'
    case 'RESOURCE_NOT_FOUND':
      return '未找到资源'
    case 'NOT_FOUND':
      return '资源不存在或无权访问'
    case 'HTTP_ERROR':
      return error.message
    case 'INVALID_RESPONSE':
      return '接口响应异常，请检查网络或基地址配置'
    case 'UNAUTHORIZED':
      return '登录已失效，请重新登录'
    case 'FORBIDDEN':
      return '没有权限执行该操作'
    case 'VALIDATION_ERROR':
      return '请求参数无效'
    default:
      return error.message
  }
}
