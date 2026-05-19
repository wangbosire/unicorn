import { AsyncLocalStorage } from 'node:async_hooks';

/// 请求级上下文存储项。`requestId` 在 HTTP 请求生命周期内贯通。
export interface RequestContext {
  requestId: string;
}

/// 全局共享的 ALS 实例。Logger 直接读取此处的 requestId。
const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return requestContextStorage.run(context, fn);
}

export function getRequestId(): string | null {
  return requestContextStorage.getStore()?.requestId ?? null;
}
