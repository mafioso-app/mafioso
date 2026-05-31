import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common'
import { WsException } from '@nestjs/websockets'
import type { Socket } from 'socket.io'

@Catch()
export class WsExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>()

    let message: string
    if (exception instanceof WsException) {
      const error = exception.getError()
      message = typeof error === 'string' ? error : JSON.stringify(error)
    } else if (exception instanceof Error) {
      message = exception.message
    } else {
      message = 'Internal server error'
    }

    client.emit('error', { code: 'WS_ERROR', message })
  }
}
