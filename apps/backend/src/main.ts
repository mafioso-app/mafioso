import './instrument'
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SentryGlobalFilter } from '@sentry/nestjs/setup'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import { GameGateway } from './modules/game/game.gateway'
import { GameOrchestrator } from './modules/game/game.orchestrator'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const logger = new Logger('Bootstrap')

  const origins = [
    process.env['WEB_URL'],
    process.env['MOBILE_URL'],
  ].filter((o): o is string => typeof o === 'string' && o.length > 0)

  app.enableCors({
    origin: origins.length > 0 ? origins : false,
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  if (process.env['SENTRY_DSN']) {
    app.useGlobalFilters(new SentryGlobalFilter())
  }
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new LoggingInterceptor())

  app.enableShutdownHooks()

  const port = process.env['PORT'] ?? 3001
  await app.listen(port)
  logger.log(`Application running on port ${port}`)

  const gateway = app.get(GameGateway)
  const orchestrator = app.get(GameOrchestrator)

  let isShuttingDown = false

  async function gracefulShutdown(signal: string): Promise<void> {
    if (isShuttingDown) return
    isShuttingDown = true
    logger.log(`Received ${signal} — starting graceful shutdown`)

    // Safety net: force exit after 10s if shutdown hangs
    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit')
      process.exit(1)
    }, 10_000)
    forceExit.unref()

    try {
      // Notify all connected players before dropping connections
      gateway.server.emit('system_message', {
        text: 'Server restarting, please reconnect shortly',
      })

      // Persist in-memory game states and clear timers (must run before Prisma closes)
      await orchestrator.shutdown()

      // Close NestJS app — triggers OnModuleDestroy on all providers (Redis, Prisma, etc.)
      await app.close()
    } catch (err: unknown) {
      logger.error(`Error during shutdown: ${String(err)}`)
    }

    clearTimeout(forceExit)
    process.exit(0)
  }

  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'))
  process.on('SIGINT', () => void gracefulShutdown('SIGINT'))
}

bootstrap()
