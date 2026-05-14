/**
 * 通用成功响应结构。
 * 后台、会员端和公开接口统一使用该包装形态。
 */
export type SuccessResponse<TData> = {
  /** 成功响应固定返回 OK。 */
  code: 'OK';
  /** 成功响应固定返回 success。 */
  message: 'success';
  /** 业务响应数据，具体结构由对应控制器返回值决定。 */
  data: TData;
};

/**
 * 通用失败响应结构。
 * code 用于前端程序化分支处理，details 用于补充结构化上下文。
 */
export type ErrorResponse = {
  /** 业务错误码，前端应优先基于该字段做分支判断。 */
  code: string;
  /** 面向客户端展示、日志排查或调试的错误信息。 */
  message: string;
  /** 可选的结构化错误详情，例如字段级校验失败列表。 */
  details?: Record<string, unknown>;
};

/**
 * 构造统一成功响应。
 * 控制器只需返回纯业务数据，响应壳由拦截器统一补齐。
 */
export function createSuccessResponse<TData>(data: TData): SuccessResponse<TData> {
  return {
    code: 'OK',
    message: 'success',
    data,
  };
}
