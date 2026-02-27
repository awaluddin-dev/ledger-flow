import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Kita tentukan bentuk bajunya (Interface Response)
export interface Response<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        // Kita bisa kustomisasi pesan jika perlu, atau biarkan default
        message: 'Request processed successfully',
        data, // Ini adalah data asli dari Service/Controller Anda
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
