import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { BizError } from './biz-error';
import { ErrorResponse } from './http-response';

type HttpResponseLike = {
  status(code: number): HttpResponseLike;
  json(body: ErrorResponse): void;
};

interface RequestMeta {
  method?: string;
  path?: string;
}

/**
 * 全局异常过滤器。
 * 统一处理 BizError、Nest HttpException 和未知异常的响应格式，
 * 确保所有失败响应都符合 code/message/details 结构约定。
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HttpResponseLike>();
    const meta = this.extractRequestMeta(ctx.getRequest<Request>());

    if (exception instanceof BizError) {
      this.logBizError(exception, meta);
      response.status(exception.status).json(
        this.toErrorResponse(exception.code, exception.message, exception.details, {
          exception,
          httpStatus: exception.status,
        }),
      );
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

      this.logHttpException(exception, status, message, meta);
      response.status(status).json(
        this.toErrorResponse(this.toDefaultErrorCode(status), message, undefined, {
          exception,
          httpStatus: status,
        }),
      );
      return;
    }

    this.logUnknownException(exception, meta);
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(
        this.toErrorResponse('INTERNAL_SERVER_ERROR', 'internal server error', undefined, {
          exception,
          httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        }),
      );
  }

  private extractRequestMeta(req: Request | undefined): RequestMeta {
    if (!req) {
      return {};
    }
    return {
      method: req.method,
      path: (req.originalUrl ?? req.url ?? '').split('?')[0] || undefined,
    };
  }

  /** 是否向 HTTP 响应附加 `debug.stack`（仅用于本地排障）。 */
  private isApiDebugErrors(): boolean {
    const v = process.env.API_DEBUG_ERRORS?.toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  }

  private shouldAttachDebugToBody(httpStatus: number): boolean {
    if (!this.isApiDebugErrors()) {
      return false;
    }
    return httpStatus >= 500;
  }

  private debugPayload(exception: unknown): ErrorResponse['debug'] | undefined {
    if (!(exception instanceof Error)) {
      return { name: 'NonError', stack: String(exception) };
    }
    return { name: exception.name, stack: exception.stack };
  }

  private logBizError(exception: BizError, meta: RequestMeta): void {
    const line = `${exception.code} ${exception.status} — ${exception.message}`;
    const fields = {
      event: 'http.biz_error',
      code: exception.code,
      httpStatus: exception.status,
      ...meta,
    };
    if (exception.status >= 500) {
      this.logger.error(line, exception.stack, ApiExceptionFilter.name, fields);
    } else {
      this.logger.warn(line, ApiExceptionFilter.name, fields);
    }
  }

  private logHttpException(
    exception: HttpException,
    status: number,
    message: string,
    meta: RequestMeta,
  ): void {
    const line = `HTTP ${status} — ${message}`;
    const fields = {
      event: 'http.exception',
      httpStatus: status,
      ...meta,
    };
    if (status >= 500) {
      this.logger.error(line, exception.stack, ApiExceptionFilter.name, fields);
    } else {
      this.logger.warn(line, ApiExceptionFilter.name, fields);
    }
  }

  private logUnknownException(exception: unknown, meta: RequestMeta): void {
    const fields = { event: 'http.unhandled', ...meta };
    if (exception instanceof Error) {
      this.logger.error(
        `未捕获异常 — ${exception.message}`,
        exception.stack,
        ApiExceptionFilter.name,
        fields,
      );
    } else {
      this.logger.error(
        '未捕获异常（非 Error）',
        String(exception),
        ApiExceptionFilter.name,
        fields,
      );
    }
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
    opts?: { exception: unknown; httpStatus: number },
  ): ErrorResponse {
    const base: ErrorResponse = {
      code,
      message,
      ...(details ? { details } : {}),
    };

    if (opts && this.shouldAttachDebugToBody(opts.httpStatus)) {
      base.debug = this.debugPayload(opts.exception);
    }

    return base;
  }
}
