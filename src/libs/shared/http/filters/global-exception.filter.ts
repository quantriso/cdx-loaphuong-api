import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import {
  BaseException,
  ValidationException,
  ConcurrencyException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@core/common';
import { DomainException } from '@core/domain';

/**
 * Global Exception Filter
 *
 * Catches all exceptions and transforms them into standardized HTTP responses
 * Maps domain exceptions to appropriate HTTP status codes
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    // Handle NestJS HttpException
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, response, request);
    }

    // Handle FastifyError (from Fastify framework)
    if (
      exception instanceof Error &&
      'code' in exception &&
      'statusCode' in exception
    ) {
      return this.handleFastifyError(exception as any, response, request);
    }

    // Handle DomainException (from @core/domain - pure Error, not BaseException)
    if (exception instanceof DomainException) {
      return this.handleDomainException(exception, response, request);
    }

    // Handle custom domain exceptions (from @core/common - extends BaseException)
    if (exception instanceof BaseException) {
      return this.handleBaseException(exception, response, request);
    }

    // Handle unknown errors
    return this.handleUnknownError(exception, response, request);
  }

  private handleHttpException(
    exception: HttpException,
    response: FastifyReply,
    request: FastifyRequest,
  ) {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message,
      details:
        typeof exceptionResponse === 'object' && 'error' in exceptionResponse
          ? exceptionResponse
          : undefined,
    };

    response.status(status).send(errorResponse);
  }

  private handleDomainException(
    exception: DomainException,
    response: FastifyReply,
    request: FastifyRequest,
  ) {
    // Map specific domain exception codes to appropriate HTTP status codes
    let status = HttpStatus.BAD_REQUEST;

    if (exception.code === 'FILE_NOT_FOUND') {
      status = HttpStatus.NOT_FOUND;
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error: {
        name: exception.name,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      },
    };

    response.status(status).send(errorResponse);
  }

  private handleBaseException(
    exception: BaseException,
    response: FastifyReply,
    request: FastifyRequest,
  ) {
    const status = this.getHttpStatus(exception);
    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error: {
        name: exception.name,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      },
    };

    response.status(status).send(errorResponse);
  }

  private handleFastifyError(
    exception: Error & { code?: string; statusCode?: number },
    response: FastifyReply,
    request: FastifyRequest,
  ) {
    // Map FastifyError to appropriate HTTP status
    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    // Handle file size exceeded error from Fastify multipart
    if (
      exception.message.includes('request file too large') ||
      exception.message.includes('File too large')
    ) {
      status = HttpStatus.BAD_REQUEST;
    }
    // Handle multipart request errors (missing file, not multipart, etc.)
    else if (
      exception.message.includes('request is not multipart') ||
      exception.message.includes('No file found') ||
      exception.message.includes('file is missing')
    ) {
      status = HttpStatus.BAD_REQUEST;
    }
    // Handle other common Fastify errors
    else if (exception.statusCode) {
      status = exception.statusCode;
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error: {
        name: exception.name,
        code: exception.code || 'FASTIFY_ERROR',
        message: exception.message,
      },
    };

    response.status(status).send(errorResponse);
  }

  private handleUnknownError(
    exception: unknown,
    response: FastifyReply,
    request: FastifyRequest,
  ) {
    const error =
      exception instanceof Error ? exception : new Error('Unknown error');
    const isDevelopment = process.env.NODE_ENV !== 'production';

    const errorResponse = {
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error: {
        name: 'InternalServerError',
        code: 'INTERNAL_SERVER_ERROR',
        message: isDevelopment ? error.message : 'An unexpected error occurred',
        ...(isDevelopment && { stack: error.stack }),
      },
    };

    if (!isDevelopment) {
      console.error('Unhandled exception:', error);
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).send(errorResponse);
  }

  private getHttpStatus(exception: BaseException): number {
    if (exception instanceof NotFoundException) {
      return HttpStatus.NOT_FOUND;
    }
    if (exception instanceof UnauthorizedException) {
      return HttpStatus.UNAUTHORIZED;
    }
    if (exception instanceof ForbiddenException) {
      return HttpStatus.FORBIDDEN;
    }
    if (exception instanceof ConflictException) {
      return HttpStatus.CONFLICT;
    }
    if (exception instanceof ConcurrencyException) {
      return HttpStatus.CONFLICT;
    }
    if (exception instanceof ValidationException) {
      return HttpStatus.BAD_REQUEST;
    }
    if (exception instanceof DomainException) {
      return HttpStatus.BAD_REQUEST;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
