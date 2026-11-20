import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '@bookflow/shared-types';
export declare class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
    private readonly reflector;
    constructor(reflector: Reflector);
    intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T> | T>;
}
//# sourceMappingURL=transform.interceptor.d.ts.map