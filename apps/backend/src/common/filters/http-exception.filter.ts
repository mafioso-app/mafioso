import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common'
import type { Request, Response } from 'express'

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const status = exception.getStatus()

    this.logger.error(`${request.method} ${request.url} → ${status}`)

    const exceptionResponse = exception.getResponse()
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : typeof exceptionResponse === 'object' &&
            exceptionResponse !== null &&
            'message' in exceptionResponse
          ? (exceptionResponse as { message: string | string[] }).message
          : exception.message

    response.status(status).json({
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message.join('; ') : message,
    })
  }
}
