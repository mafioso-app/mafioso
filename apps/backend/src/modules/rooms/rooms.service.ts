import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { customAlphabet } from 'nanoid'
import { PrismaService } from '../../prisma/prisma.service'
import type { RoomSettings } from '@mafioso/types'
import { ROOM_TEMPLATES } from '@mafioso/engine'
import type { CreateRoomDto } from './dto/create-room.dto'

const roomCodeGen = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6)

const DEFAULT_SETTINGS: RoomSettings = {
  onSiteMode: false,
  doctorCanSaveSelf: true,
  tieVoteRule: 'no_elimination',
  nightDurationSeconds: 60,
  dayDiscussionDurationSeconds: 120,
  dayVotingDurationSeconds: 60,
  maxPlayers: 20,
  requireInvite: false,
}

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly events: EventEmitter2,
  ) {}

  getTemplates() {
    return Object.values(ROOM_TEMPLATES)
  }

  async createRoom(moderatorId: string, dto: CreateRoomDto) {
    try {
      if (dto.templateId && dto.templateId !== 'custom') {
        const template = ROOM_TEMPLATES[dto.templateId]
        if (!template) throw new BadRequestException(`Unknown templateId: ${dto.templateId}`)
        const enabledRoles = Object.entries(template.roles)
          .flatMap(([role, count]) => Array(count).fill(role) as string[])
        dto = { ...dto, enabledRoles, maxPlayers: template.maxPlayers }
      }

      const settings: RoomSettings = { ...DEFAULT_SETTINGS, ...dto }

      const code = await this.generateUniqueCode()

      const room = await this.prisma.room.create({
        data: {
          code,
          moderatorId,
          settings: settings as object,
          status: 'LOBBY',
        },
      })

      const session = await this.prisma.gameSession.create({
        data: { roomId: room.id, phase: 'LOBBY' },
      })

      return { roomCode: room.code, roomId: room.id, sessionId: session.id }
    } catch (err: unknown) {
      if (err instanceof BadRequestException || err instanceof InternalServerErrorException) throw err
      this.logger.error('createRoom failed', err)
      throw new InternalServerErrorException('Failed to create room')
    }
  }

  async joinRoom(userId: string, roomCode: string, inviteToken?: string) {
    try {
      const room = await this.prisma.room.findUnique({ where: { code: roomCode } })
      if (!room) throw new NotFoundException('Room not found')

      // Idempotent rejoin: if user already has a session, return it regardless of room status
      const existingSession = await this.prisma.playerSession.findFirst({
        where: { session: { roomId: room.id }, userId },
      })
      if (existingSession) return existingSession

      // New player — check room is still accepting
      if (room.status === 'FINISHED') throw new BadRequestException('Game has ended')
      if (room.status === 'ACTIVE') throw new BadRequestException('Game already in progress')

      const settings = room.settings as unknown as RoomSettings
      const maxPlayers = settings.maxPlayers ?? 20

      if (settings.requireInvite) {
        if (!inviteToken) throw new ForbiddenException('Invite token required')
        try {
          const payload = this.jwt.verify<{ roomCode: string }>(inviteToken)
          if (payload.roomCode !== roomCode) throw new Error('Room code mismatch')
        } catch {
          throw new ForbiddenException('Invalid or expired invite token')
        }
      }

      const session = await this.prisma.gameSession.findFirst({
        where: { roomId: room.id, endedAt: null },
        include: { players: true },
      })
      if (!session) throw new BadRequestException('No active session for this room')

      if (session.players.length >= maxPlayers) {
        throw new BadRequestException('Room is full')
      }

      const nextSeat = session.players.length + 1

      return await this.prisma.playerSession.create({
        data: { sessionId: session.id, userId, seat: nextSeat, isAlive: true },
      })
    } catch (err: unknown) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException ||
        err instanceof ForbiddenException
      ) {
        throw err
      }
      this.logger.error('joinRoom failed', err)
      throw new InternalServerErrorException('Failed to join room')
    }
  }

  async getRoomStatus(roomCode: string, _requestingUserId: string) {
    try {
      const room = await this.prisma.room.findUnique({
        where: { code: roomCode },
        include: {
          sessions: {
            where: { endedAt: null },
            take: 1,
            include: {
              players: { include: { user: { select: { id: true, username: true } } } },
            },
          },
        },
      })
      if (!room) throw new NotFoundException('Room not found')

      const session = room.sessions[0] ?? null
      return {
        roomCode: room.code,
        roomId: room.id,
        status: room.status,
        moderatorId: room.moderatorId,
        phase: session?.phase ?? 'LOBBY',
        playerCount: session?.players.length ?? 0,
        players: (session?.players ?? []).map((p: { userId: string; id: string; role: string | null; isAlive: boolean; seat: number; user?: { id: string; username: string } }) => ({
          id: p.id,
          userId: p.userId,
          username: p.user?.username ?? '',
          seat: p.seat,
          isAlive: p.isAlive,
        })),
      }
    } catch (err: unknown) {
      if (err instanceof NotFoundException) throw err
      this.logger.error('getRoomStatus failed', err)
      throw new InternalServerErrorException('Failed to get room status')
    }
  }

  async generateInviteLink(roomCode: string, moderatorId: string) {
    try {
      const room = await this.prisma.room.findUnique({ where: { code: roomCode } })
      if (!room) throw new NotFoundException('Room not found')
      if (room.moderatorId !== moderatorId) throw new ForbiddenException('Not the moderator')

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const token = this.jwt.sign({ roomCode }, { expiresIn: '24h' })
      const webUrl = process.env['WEB_URL'] ?? 'http://localhost:3000'
      return { inviteUrl: `${webUrl}/join/${token}`, token, expiresAt }
    } catch (err: unknown) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err
      this.logger.error('generateInviteLink failed', err)
      throw new InternalServerErrorException('Failed to generate invite link')
    }
  }

  async joinByToken(token: string, userId: string) {
    let roomCode: string
    try {
      const payload = this.jwt.verify<{ roomCode: string }>(token)
      roomCode = payload.roomCode
    } catch {
      throw new ForbiddenException('Invalid or expired invite token')
    }
    return this.joinRoom(userId, roomCode)
  }

  async startGame(roomCode: string, moderatorId: string) {
    this.logger.log(`startGame called: roomCode=${roomCode}, userId=${moderatorId}`)
    try {
      const room = await this.prisma.room.findUnique({ where: { code: roomCode } })
      this.logger.log(`Room found: status=${room?.status}, moderatorId=${room?.moderatorId}, requesting=${moderatorId}`)
      if (!room) throw new NotFoundException('Room not found')
      if (room.moderatorId !== moderatorId) throw new ForbiddenException('Not the moderator')
      // Only reject if the game is fully finished — allow re-start from ACTIVE (e.g. after reconnect)
      if (room.status === 'FINISHED') throw new BadRequestException('Game is already finished')

      if (room.status === 'LOBBY') {
        await this.prisma.room.update({
          where: { code: roomCode },
          data: { status: 'ACTIVE' },
        })
      }

      this.events.emit('room.start', { roomCode, roomId: room.id })
      this.logger.log(`room.start event emitted for room ${roomCode}`)
      return { started: true }
    } catch (err: unknown) {
      if (
        err instanceof NotFoundException ||
        err instanceof ForbiddenException ||
        err instanceof BadRequestException
      ) {
        throw err
      }
      this.logger.error('startGame failed', err)
      throw new InternalServerErrorException('Failed to start game')
    }
  }

  async getRoomEvents(roomCode: string) {
    try {
      const room = await this.prisma.room.findUnique({ where: { code: roomCode } })
      if (!room) throw new NotFoundException('Room not found')

      const session = await this.prisma.gameSession.findFirst({
        where: { roomId: room.id },
        orderBy: { startedAt: 'desc' },
      })
      if (!session) return { events: [] }

      const events = await this.prisma.gameEvent.findMany({
        where: { sessionId: session.id },
        orderBy: { sequence: 'asc' },
      })

      return { events }
    } catch (err: unknown) {
      if (err instanceof NotFoundException) throw err
      this.logger.error('getRoomEvents failed', err)
      throw new InternalServerErrorException('Failed to get room events')
    }
  }

  private async generateUniqueCode(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const code = roomCodeGen()
      const existing = await this.prisma.room.findUnique({ where: { code } })
      if (!existing) return code
    }
    throw new InternalServerErrorException('Could not generate unique room code')
  }
}
