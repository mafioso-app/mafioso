import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createApp } from './helpers/create-app'

describe('Health (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /health returns 200 with status ok, db true, redis true', async () => {
    const res = await request(app.getHttpServer()).get('/health')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.db).toBe(true)
    expect(res.body.redis).toBe(true)
    expect(typeof res.body.timestamp).toBe('string')
  })
})
