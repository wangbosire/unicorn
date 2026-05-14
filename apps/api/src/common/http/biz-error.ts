/**
 * 业务异常。
 * 所有可预期的业务失败统一通过该异常抛出，再由全局异常过滤器转换为标准错误响应。
 */
export class BizError extends Error {
  /** 业务错误码。 */
  readonly code: string;

  /** HTTP 状态码。 */
  readonly status: number;

  /** 可选的结构化错误详情。 */
  readonly details?: Record<string, unknown>;

  constructor(params: {
    code: string;
    message: string;
    status?: number;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = 'BizError';
    this.code = params.code;
    this.status = params.status ?? 400;
    this.details = params.details;
  }
}
