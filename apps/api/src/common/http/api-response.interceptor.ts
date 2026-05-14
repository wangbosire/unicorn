import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { createSuccessResponse, SuccessResponse } from './http-response';

/**
 * 全局成功响应拦截器。
 * 控制器只返回纯业务数据，由拦截器统一包装为成功响应结构。
 */
@Injectable()
export class ApiResponseInterceptor<TData>
  implements NestInterceptor<TData, SuccessResponse<TData>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<TData>,
  ): Observable<SuccessResponse<TData>> {
    return next.handle().pipe(map((data) => createSuccessResponse(data)));
  }
}
