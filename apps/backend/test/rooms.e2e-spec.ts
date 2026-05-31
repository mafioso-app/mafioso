import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createApp, cleanupTestData } from './helpers/create-app'
import { PrismaService } from '../src/prisma/prisma.service'

const SUFFIX = Date.now().toString(36)

describe('Rooms (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let modToken: string
  let playerToken: string
  let roomCode: string

  beforeAll(async () => {
    app = await createApp()
    prisma = app.get(PrismaService)
    await cleanupTestData(prisma)

    const modRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: `e2e_mod_${SUFFIX}`, password: 'Password123!' })
    modToken = modRes.body.accessToken as string

    const playerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ username: `e2e_player_${SUFFIX}`, password: 'Password123!' })
    playerToken = playerRes.body.accessToken as string
  })

  afterAll(async () => {
    await cleanupTestData(prisma)
    await app.close()
  })

  it('POST /rooms (unauthenticated) returns 401', async () => {
    const res = await request(app.getHttpServer()).post('/rooms').send({})
    expect(res.status).toBe(401)
  })

  it('POST /rooms (authenticated) returns 201 with roomCode', async () => {
    const res = await request(app.getHttpServer())
      .post('/rooms')
      .set('Authorization', `Bearer ${modToken}`)
      .send({})

    expect(res.status).toBe(201)
    expect(typeof res.body.roomCode).toBe('string')
    expect(res.body.roomCode).toHaveLength(6)
    roomCode = res.body.roomCode as string
  })

  it('POST /rooms/:code/join (invalid code) returns 404', async () => {
    const res = await request(app.getHttpServer())
      .post('/rooms/XXXXXX/join')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({})

    expect(res.status).toBe(404)
  })

  it('POST /rooms/:code/join (authenticated, valid code) returns 201', async () => {
    const res = await request(app.getHttpServer())
      .post(`/rooms/${roomCode}/join`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({})

    expect(res.status).toBe(201)
  })

  it('POST /rooms/:code/join (already joined) returns 409', async () => {
    const res = await request(app.getHttpServer())
      .post(`/rooms/${roomCode}/join`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({})

    expect(res.status).toBe(409)
  })

  it('GET /rooms/:code/status returns 200 with player list', async () => {
    const res = await request(app.getHttpServer())
      .get(`/rooms/${roomCode}/status`)
      .set('Authorization', `Bearer ${modToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.players)).toBe(true)
    expect(res.body.players.length).toBeGreaterThan(0)
    expect(res.body.roomCode).toBe(roomCode)
  })

  it('POST /rooms/:code/start (by non-moderator) returns 403', async () => {
    const res = await request(app.getHttpServer())
      .post(`/rooms/${roomCode}/start`)
      .set('Authorization', `Bearer ${playerToken}`)

    expect(res.status).toBe(403)
  })

  it('POST /rooms/:code/start (by moderator) returns 200', async () => {
    const res = await request(app.getHttpServer())
      .post(`/rooms/${roomCode}/start`)
      .set('Authorization', `Bearer ${modToken}`)

    expect(res.status).toBe(200)
    expect(res.body.started).toBe(true)
  })
})
