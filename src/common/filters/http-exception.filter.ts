import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch() // Kita tangkap semua jenis error
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 1. Tentukan Status Code (400, 401, 500, dll)
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // 2. Ambil Pesan Error
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // 3. Log Error-nya (Sangat berguna untuk debugging di server)
    this.logger.error(
      `Http Status: ${status} Error Message: ${JSON.stringify(message)}`,
    );

    // 4. Kirim Response Error yang sudah rapi
    response.status(status).json({
      success: false, // Perhatikan: kita pakai format yang mirip dengan Interceptor
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        (message as { message?: string }).message ||
        message ||
        'Internal server error',
    });
  }
}
