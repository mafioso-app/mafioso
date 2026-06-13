import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Logger, UseFilters, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { JwtService } from '@nestjs/jwt'
import { Server, Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { filterStateForPlayer } from '@mafioso/engine'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'
import { WsExceptionFilter } from '../../common/filters/ws-exception.filter'
import { GameOrchestrator } from './game.orchestrator'
import { ChatService } from './chat.service'
import { JoinRoomSocketDto } from './dto/join-room-socket.dto'
import { ReconnectSocketDto } from './dto/reconnect-socket.dto'
import { VoteCastSocketDto } from './dto/vote-cast-socket.dto'
import { NightActionSocketDto } from './dto/night-action-socket.dto'
import { SendMessageSocketDto } from './dto/send-message-socket.dto'
import { ModeratorAnnounceSocketDto } from './dto/moderator-announce-socket.dto'
import { SpectatorGuard } from '../../common/guards/spectator.guard'
import { TimerService } from './timer.service'

interface JwtPayload {
  sub: string
  username: string
  isGuest: boolean
}

@WebSocketGateway({ namespace: '/game', cors: { origin: '*' } })
@UseFilters(WsExceptionFilter)
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  private readonly logger = new Logger(GameGateway.name)

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly orchestrator: GameOrchestrator,
    private readonly chat: ChatService,
    private readonly timerService: TimerService,
  ) {}

  private redisAdapterSet = false

  afterInit(): void {
    this.logger.log('Gateway initialized')
  }

  async handleConnection(client: Socket): Promise<void> {
    if (!this.redisAdapterSet) {
      try {
        const pub = this.redis.getPubClient()
        const sub = this.redis.getSubClient()
        if (pub && sub) {
          this.server.adapter(createAdapter(pub, sub))
          this.redisAdapterSet = true
          this.logger.log('Redis adapter connected successfully')
        }
      } catch (e) {
        this.logger.error('Redis adapter failed: ' + (e as Error).message)
      }
    }

    // Accept token from handshake.auth.token OR Authorization: Bearer <token> header
    const authHeader = client.handshake.headers['authorization'] as string | undefined
    const token =
      (client.handshake.auth['token'] as string | undefined) ??
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined)

    if (!token) {
      client.emit('error', { code: 'UNAUTHORIZED', message: 'Unauthorized' })
      client.disconnect()
      return
    }

    try {
      const payload = this.jwt.verify<JwtPayload>(token)
      client.data['userId'] = payload.sub
      client.data['username'] = payload.username
      client.data['isGuest'] = payload.isGuest
      // Each user gets their own private room keyed by userId for direct messages
      await client.join(payload.sub)
      this.logger.log(`Client connected: ${payload.sub}`)
    } catch {
      client.emit('error', { code: 'UNAUTHORIZED', message: 'Unauthorized' })
      client.disconnect()
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data['userId'] as string | undefined
    const sessionId = client.data['sessionId'] as string | undefined
    const roomCode = client.data['roomCode'] as string | undefined
    this.logger.log(`Client disconnected: ${userId ?? 'unknown'}`)

    if (sessionId && userId && roomCode) {
      const state = this.orchestrator.getState(sessionId)
      const player = state?.players.find((p) => p.userId === userId)
      if (player) {
        this.server.to(roomCode).emit('player_updated', {
          playerId: player.id,
          isAlive: player.isAlive,
          connected: false,
        })
      }
    }
  }

  @SubscribeMessage('join_room')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinRoomSocketDto,
  ): Promise<void> {
    await this.attachToRoom(client, dto.roomCode)
  }

  @SubscribeMessage('reconnect_state')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleReconnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ReconnectSocketDto,
  ): Promise<void> {
    await this.attachToRoom(client, dto.roomCode)
  }

  @SubscribeMessage('vote_cast')
  @UseGuards(SpectatorGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleVoteCast(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: VoteCastSocketDto,
  ): Promise<void> {
    const userId = client.data['userId'] as string
    const sessionId = client.data['sessionId'] as string | undefined

    if (!sessionId) {
      client.emit('action_ack', { eventType: 'vote_cast', success: false, error: 'Not in a game session' })
      return
    }

    const state = this.orchestrator.getState(sessionId)
    const player = state?.players.find((p) => p.userId === userId)
    if (!player) {
      client.emit('action_ack', { eventType: 'vote_cast', success: false, error: 'Player not found in session' })
      return
    }

    await this.orchestrator.handleVote(sessionId, player.id, dto.targetId, client, this.server)
  }

  @SubscribeMessage('night_action')
  @UseGuards(SpectatorGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleNightAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: NightActionSocketDto,
  ): Promise<void> {
    const userId = client.data['userId'] as string
    const sessionId = client.data['sessionId'] as string | undefined

    if (!sessionId) {
      client.emit('action_ack', { eventType: 'night_action', success: false, error: 'Not in a game session' })
      return
    }

    const state = this.orchestrator.getState(sessionId)
    const player = state?.players.find((p) => p.userId === userId)
    if (!player) {
      client.emit('action_ack', { eventType: 'night_action', success: false, error: 'Player not found in session' })
      return
    }

    await this.orchestrator.handleNightAction(
      sessionId,
      { actorId: player.id, targetId: dto.targetId, actionType: dto.actionType },
      client,
      this.server,
    )
  }

  @SubscribeMessage('send_message')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageSocketDto,
  ): Promise<void> {
    const userId = client.data['userId'] as string
    const sessionId = client.data['sessionId'] as string | undefined
    const roomCode = client.data['roomCode'] as string | undefined

    if (!sessionId || !roomCode) {
      client.emit('action_ack', { eventType: 'send_message', success: false, error: 'Not in a session' })
      return
    }

    const state = this.orchestrator.getState(sessionId)
    const player = state?.players.find((p) => p.userId === userId)
    const isSpectator = !player || !player.isAlive

    const message = this.chat.sendMessage(
      sessionId,
      player?.id ?? userId,
      client.data['username'] as string,
      dto.content,
      state?.phase ?? ('LOBBY' as never),
      isSpectator,
    )

    if (!message) {
      client.emit('action_ack', { eventType: 'send_message', success: false, error: 'Cannot send message now' })
      return
    }

    this.server.to(roomCode).emit('new_message', message)
  }

  @SubscribeMessage('moderator_announce')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleModeratorAnnounce(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ModeratorAnnounceSocketDto,
  ): Promise<void> {
    const roomCode = client.data['roomCode'] as string | undefined
    if (!roomCode) return

    this.server.to(roomCode).emit('moderator_announce', {
      message: dto.message,
      timestamp: Date.now(),
    })
  }

  @OnEvent('room.start')
  async handleRoomStart(payload: { roomCode: string; roomId: string }): Promise<void> {
    try {
      await this.orchestrator.startGame(payload.roomCode, this.server)
      this.logger.log(`Game started in room ${payload.roomCode}`)
    } catch (e) {
      this.logger.error(`Failed to start game in room ${payload.roomCode}: ${(e as Error).message}`)
      this.server
        .to(payload.roomCode)
        .emit('error', { message: 'Failed to start game. Please try again.' })
    }
  }

  private async attachToRoom(client: Socket, roomCode: string): Promise<void> {
    const userId = client.data['userId'] as string

    const room = await this.prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        sessions: {
          where: { endedAt: null },
          take: 1,
          include: {
            players: {
              include: { user: { select: { username: true } } },
            },
          },
        },
      },
    })

    if (!room) {
      client.emit('error', { code: 'NOT_FOUND', message: 'Room not found' })
      return
    }

    const session = room.sessions[0]
    if (!session) {
      client.emit('error', { code: 'NOT_FOUND', message: 'No active session' })
      return
    }

    const playerSession = session.players.find((p: { userId: string; id: string; role: string | null; isAlive: boolean; seat: number }) => p.userId === userId)
    if (!playerSession) {
      client.emit('error', { code: 'FORBIDDEN', message: 'You are not in this room' })
      return
    }

    await client.join(roomCode)
    if (room.moderatorId === userId) {
      await client.join(`mod:${roomCode}`)
    }

    // Store session context for subsequent events
    client.data['sessionId'] = session.id
    client.data['roomCode'] = roomCode

    // Emit persisted or in-memory state
    const liveState = this.orchestrator.getState(session.id)
    if (liveState) {
      const filtered = filterStateForPlayer(liveState, playerSession.id)
      client.emit('state_sync', filtered)

      // Emit current timer so client countdown resumes
      const timerEndsAt = await this.timerService.getTimerEndsAt(session.id)
      if (timerEndsAt && timerEndsAt > Date.now()) {
        client.emit('timer_tick', { timerEndsAt, phase: liveState.phase })
      }

      // Emit last 50 chat messages for history
      const recentMessages = this.chat.getLastMessages(session.id, 50)
      if (recentMessages.length > 0) {
        client.emit('chat_history', { messages: recentMessages })
      }

      // If game is already over, emit game_over
      if (liveState.winner) {
        client.emit('game_over', { winner: liveState.winner })
      }
    } else {
      client.emit('state_sync', {
        sessionId: session.id,
        roomId: room.id,
        phase: session.phase,
        players: session.players.map((p: { userId: string; id: string; role: string | null; isAlive: boolean; seat: number; user?: { username: string } }) => ({
          id: p.id,
          userId: p.userId,
          username: p.user?.username ?? '',
          seat: p.seat,
          isAlive: p.isAlive,
          role: null,
        })),
        votes: {},
        timerEndsAt: null,
        winner: null,
      })
    }

    // Notify room that this player reconnected
    this.server.to(roomCode).emit('player_updated', {
      playerId: playerSession.id,
      isAlive: playerSession.isAlive,
      connected: true,
    })
  }
}

