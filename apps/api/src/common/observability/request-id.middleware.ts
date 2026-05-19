import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { runWithRequestContext } from './request-context';

const REQUEST_ID_HEADER = 'x-request-id';
/// header 来源截断上限，避免日志膨胀或异常长字段被注入。
const MAX_REQUEST_ID_LENGTH = 64;
/// 允许通过的字符；其余字符触发重新生成。
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]+$/;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const raw = Array.isArray(incoming) ? incoming[0] : incoming;
    const requestId = this.sanitize(raw) ?? randomUUID();

    res.setHeader(REQUEST_ID_HEADER, requestId);
    runWithRequestContext({ requestId }, () => next());
  }

  private sanitize(value: string | undefined): string | null {
    if (!value) {
      return null;
    }
    const trimmed = value.slice(0, MAX_REQUEST_ID_LENGTH).trim();
    return trimmed && SAFE_REQUEST_ID.test(trimmed) ? trimmed : null;
  }
}
