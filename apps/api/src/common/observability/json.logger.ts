import type { LoggerService, LogLevel } from '@nestjs/common';
import { getRequestId } from './request-context';

const LEVEL_MAP: Record<string, LogLevel> = {
  log: 'log',
  info: 'log',
  warn: 'warn',
  error: 'error',
  debug: 'debug',
  verbose: 'verbose',
  fatal: 'fatal',
};

/// 业务字段平铺规则：禁止嵌套对象，遇到 object 序列化为 JSON 字符串。
function flattenValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  return value;
}

/// 解析可变参列表，匹配 Nest LoggerService 调用约定：
/// - `log/warn/debug/verbose(msg, context, ...objects)`
/// - `error/fatal(msg, stack, context, ...objects)`
function pickPayload(
  args: unknown[],
  isError: boolean,
): { context?: string; fields: Record<string, unknown>; stack?: string } {
  const strings: string[] = [];
  const objects: Record<string, unknown>[] = [];
  for (const arg of args) {
    if (typeof arg === 'string') {
      strings.push(arg);
    } else if (arg && typeof arg === 'object') {
      objects.push(arg as Record<string, unknown>);
    }
  }

  let context: string | undefined;
  let stack: string | undefined;
  if (isError) {
    stack = strings[0];
    context = strings[1];
  } else {
    context = strings[0];
    stack = strings[1];
  }

  const fields: Record<string, unknown> = {};
  for (const obj of objects) {
    for (const [key, val] of Object.entries(obj)) {
      fields[key] = flattenValue(val);
    }
  }

  return { context, fields, stack };
}

/// 结构化 JSON Logger。
/// 输出单行 JSON 到 stdout/stderr；自动从 ALS 注入 `requestId`。
export class JsonLogger implements LoggerService {
  constructor(private readonly defaultContext: string = 'Nest') {}

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.emit('log', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.emit('error', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.emit('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.emit('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.emit('verbose', message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.emit('fatal', message, optionalParams);
  }

  setLogLevels(_levels: LogLevel[]): void {
    // 当前不区分级别开关；预留接口以兼容 Nest LoggerService 协议。
  }

  private emit(level: string, message: unknown, optionalParams: unknown[]): void {
    const isError = level === 'error' || level === 'fatal';
    const { context, fields, stack } = pickPayload(optionalParams, isError);
    const record: Record<string, unknown> = {
      ts: new Date().toISOString(),
      level: LEVEL_MAP[level] ?? level,
      ctx: context ?? this.defaultContext,
      requestId: getRequestId(),
      msg: this.toMessage(message),
      ...fields,
    };
    if (stack) {
      record.stack = stack;
    }
    const line = JSON.stringify(record);
    if (level === 'error' || level === 'fatal') {
      process.stderr.write(`${line}\n`);
    } else {
      process.stdout.write(`${line}\n`);
    }
  }

  private toMessage(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (value instanceof Error) {
      return value.message;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}
