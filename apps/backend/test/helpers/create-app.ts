import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ThrottlerGuard } from '@nestjs/throttler'
import { AppModule } from '../../src/app.module'
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter'
import { LoggingInterceptor } from '../../src/common/interceptors/logging.interceptor'
import { PrismaService } from '../../src/prisma/prisma.service'
import { RedisService } from '../../src/redis/redis.service'
import { FakePrismaService } from '../mocks/fake-prisma.service'
import { FakeRedisService } from '../mocks/fake-redis.service'

export async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .overrideProvider(PrismaService)
    .useClass(FakePrismaService)
    .overrideProvider(RedisService)
    .useClass(FakeRedisService)
    .compile()

  const app = moduleRef.createNestApplication()
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  )
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new LoggingInterceptor())
  await app.init()
  return app
}

export async function cleanupTestData(prisma: PrismaService): Promise<void> {
  const users = await prisma.user.findMany({
    where: { username: { startsWith: 'e2e_' } },
    select: { id: true },
  })
  const userIds = users.map((u: { id: string }) => u.id)
  if (userIds.length === 0) return

  await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } })

  const rooms = await prisma.room.findMany({
    where: { moderatorId: { in: userIds } },
    select: { id: true },
  })
  const roomIds = rooms.map((r: { id: string }) => r.id)

  if (roomIds.length > 0) {
    const sessions = await prisma.gameSession.findMany({
      where: { roomId: { in: roomIds } },
      select: { id: true },
    })
    const sessionIds = sessions.map((s: { id: string }) => s.id)

    if (sessionIds.length > 0) {
      await prisma.playerSession.deleteMany({ where: { sessionId: { in: sessionIds } } })
      await prisma.gameEvent.deleteMany({ where: { sessionId: { in: sessionIds } } })
      await prisma.gameSession.deleteMany({ where: { id: { in: sessionIds } } })
    }
    await prisma.room.deleteMany({ where: { id: { in: roomIds } } })
  }

  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
}
