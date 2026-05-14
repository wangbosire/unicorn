import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BizError } from './biz-error';
import { ErrorResponse } from './http-response';

type HttpResponseLike = {
  status(code: number): HttpResponseLike;
  json(body: ErrorResponse): void;
};

/**
 * 全局异常过滤器。
 * 统一处理 BizError、Nest HttpException 和未知异常的响应格式，
 * 确保所有失败响应都符合 code/message/details 结构约定。
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HttpResponseLike>();

    if (exception instanceof BizError) {
      response
        .status(exception.status)
        .json(this.toErrorResponse(exception.code, exception.message, exception.details));
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : this.extractHttpExceptionMessage(
              exceptionResponse as Record<string, unknown>,
            );

      response
        .status(status)
        .json(this.toErrorResponse(this.toDefaultErrorCode(status), message));
      return;
    }

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(this.toErrorResponse('INTERNAL_SERVER_ERROR', 'internal server error'));
  }

  /**
   * 提取 Nest HttpException 的 message 字段。
   */
  private extractHttpExceptionMessage(
    exceptionResponse: Record<string, unknown>,
  ): string {
    const message = exceptionResponse.message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }

    return 'request failed';
  }

  /**
   * 将 HTTP 状态码映射为默认错误码。
   * 这类错误码主要用于兜底框架异常，业务异常应优先显式抛出 BizError。
   */
  private toDefaultErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'RESOURCE_NOT_FOUND';
      default:
        return 'REQUEST_FAILED';
    }
  }

  /**
   * 构造统一错误响应。
   * 仅在错误详情存在时透传 details，避免产生无意义的空字段。
   */
  private toErrorResponse(
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ): ErrorResponse {
    return {
      code,
      message,
      ...(details ? { details } : {}),
    };
  }
}
