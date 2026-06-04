import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private readonly pubClient: Redis
  private readonly subClient: Redis

  constructor() {
    const url = process.env['REDIS_URL'] ?? 'redis://localhost:6379'
    this.logger.log('Connecting to Redis: ' + (process.env['REDIS_URL'] ? 'URL set' : 'URL NOT SET'))
    this.pubClient = new Redis(url)
    this.subClient = this.pubClient.duplicate()

    this.pubClient.on('error', (err) => this.logger.error('Redis pubClient error: ' + String(err)))
    this.subClient.on('error', (err) => this.logger.error('Redis subClient error: ' + String(err)))
    this.pubClient.on('connect', () => this.logger.log('Redis pubClient connected'))
    this.subClient.on('connect', () => this.logger.log('Redis subClient connected'))
  }

  getPubClient(): Redis {
    return this.pubClient
  }

  getSubClient(): Redis {
    return this.subClient
  }

  getClient(): Redis {
    return this.pubClient
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.pubClient.ping()
      return result === 'PONG'
    } catch {
      return false
    }
  }

  async onModuleDestroy() {
    await this.pubClient.quit()
    await this.subClient.quit()
    this.logger.log('Redis clients disconnected')
  }
}
