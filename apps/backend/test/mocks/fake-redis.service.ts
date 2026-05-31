import { Injectable } from '@nestjs/common'

@Injectable()
export class FakeRedisService {
  isHealthy = async () => true
  getPubClient = () => ({}) as never
  getSubClient = () => ({}) as never
  getClient = () => ({}) as never
  onModuleDestroy = async () => {}
}
