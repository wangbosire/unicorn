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
    case 'MEMBER_ACCOUNT_FROZEN':
      return '当前会员已被冻结，暂不可发表评论'
    case 'FORBIDDEN':
      return '没有权限执行该操作'
    case 'VALIDATION_ERROR':
      return '请求参数无效'
    case 'PUBLIC_COLLECTION_NOT_FOUND':
      return '目标公开藏品不存在或暂不可评论'
    case 'COMMENT_NOT_FOUND':
      return '目标评论不存在或已失效'
    case 'COMMENT_NOT_REPLYABLE':
      return '当前评论暂不支持回复'
    case 'COMMENT_REPLY_DEPTH_EXCEEDED':
      return '一期仅支持回复一级评论'
    case 'MESSAGE_NOT_FOUND':
      return '目标消息不存在或无权访问'
    case 'COLLECTION_NOT_TRANSFERABLE':
      return '当前藏品暂不可发起转让'
    case 'COLLECTION_TRANSFER_ALREADY_PENDING':
      return '该藏品已有待接收转让，请先处理现有转让单'
    case 'TRANSFER_TARGET_MEMBER_NOT_FOUND':
      return '未找到目标会员，请确认会员编号'
    case 'TRANSFER_TARGET_MEMBER_INVALID':
      return '不能转让给自己'
    case 'TRANSFER_NOT_FOUND':
      return '转让单不存在或已失效'
    case 'TRANSFER_STATUS_INVALID':
      return '当前转让状态不允许继续接收'
    case 'TRANSFER_EXPIRED':
      return '该转让已过期'
    case 'TRANSFER_ACCEPT_FORBIDDEN':
      return '当前账号不能接收这笔指定会员转让'
    default:
      return error.message
  }
}
