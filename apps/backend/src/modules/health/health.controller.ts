import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    const [db, redis] = await Promise.all([this.checkDb(), this.redis.isHealthy()])

    const status = db && redis ? 'ok' : 'degraded'
    const payload = { status, timestamp: new Date().toISOString(), db, redis }

    if (status === 'degraded') {
      throw new HttpException(payload, HttpStatus.SERVICE_UNAVAILABLE)
    }

    return payload
  }

  private async checkDb(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return true
    } catch {
      return false
    }
  }
}
