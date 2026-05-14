/**
 * 后台前端统一业务错误。
 * 用于承接后端返回的 code/message/details 结构，便于 React Query 和页面层统一处理。
 */
export class ApiError extends Error {
  /** 业务错误码，优先用于前端程序化分支处理。 */
  readonly code: string

  /** HTTP 状态码；纯业务错误场景下可能为空。 */
  readonly status?: number

  /** 可选的结构化错误详情。 */
  readonly details?: Record<string, unknown>

  constructor(params: {
    code: string
    message: string
    status?: number
    details?: Record<string, unknown>
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.code = params.code
    this.status = params.status
    this.details = params.details
  }
}
