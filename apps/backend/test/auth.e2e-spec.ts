import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createApp, cleanupTestData } from './helpers/create-app'
import { PrismaService } from '../src/prisma/prisma.service'

const SUFFIX = Date.now().toString(36)

describe('Auth (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  // Registered once and reused across multiple test groups
  const sharedUsername = `e2e_user_${SUFFIX}`
  const sharedPassword = 'Password123!'
  let sharedRefreshToken: string

  beforeAll(async () => {
    app = await createApp()
    prisma = app.get(PrismaService)
    await cleanupTestData(prisma)

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: sharedUsername, password: sharedPassword })

    sharedRefreshToken = res.body.refreshToken as string
  })

  afterAll(async () => {
    await cleanupTestData(prisma)
    await app.close()
  })

  describe('POST /auth/register', () => {
    it('returns 201 with accessToken and refreshToken', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: `e2e_reg_${SUFFIX}`, password: 'Password123!' })

      expect(res.status).toBe(201)
      expect(typeof res.body.accessToken).toBe('string')
      expect(typeof res.body.refreshToken).toBe('string')
    })

    it('returns 409 on duplicate username', async () => {
      const dupName = `e2e_dup_${SUFFIX}`
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: dupName, password: 'Password123!' })

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: dupName, password: 'Password456!' })

      expect(res.status).toBe(409)
    })
  })

  describe('POST /auth/login', () => {
    it('returns 200 with tokens on correct credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: sharedUsername, password: sharedPassword })

      expect(res.status).toBe(200)
      expect(typeof res.body.accessToken).toBe('string')
      expect(typeof res.body.refreshToken).toBe('string')
    })

    it('returns 401 on wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: sharedUsername, password: 'wrongpassword' })

      expect(res.status).toBe(401)
    })
  })

  it('POST /auth/guest returns 200 with accessToken and no refreshToken', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/guest')
      .send({ username: `e2e_guest_${SUFFIX}` })

    expect(res.status).toBe(200)
    expect(typeof res.body.accessToken).toBe('string')
    expect(res.body.refreshToken).toBeUndefined()
  })

  it('POST /auth/refresh with valid token returns 200 with new accessToken', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: sharedRefreshToken })

    expect(res.status).toBe(200)
    expect(typeof res.body.accessToken).toBe('string')
  })

  it('POST /auth/logout returns 204', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: sharedRefreshToken })

    expect(res.status).toBe(204)
  })
})
