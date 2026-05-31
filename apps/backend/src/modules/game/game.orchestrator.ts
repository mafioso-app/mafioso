import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Prisma } from '@prisma/client'
import { Server, Socket } from 'socket.io'
import { GamePhase, Team } from '@mafioso/types'
import type { RoomSettings } from '@mafioso/types'
import {
  assignRoles,
  checkWinCondition,
  filterStateForPlayer,
  processNightAction,
  resolveNightPhase,
  resolveDayVote,
} from '@mafioso/engine'
import type { EngineGameState, NightAction } from '@mafioso/engine'
import { PrismaService } from '../../prisma/prisma.service'
import type { TimerService } from './timer.service'

@Injectable()
export class GameOrchestrator {
  private readonly logger = new Logger(GameOrchestrator.name)
  private readonly states = new Map<string, EngineGameState>()
  private timerService?: TimerService

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  setTimerService(timerService: TimerService): void {
    this.timerService = timerService
  }

  async shutdown(): Promise<void> {
    this.timerService?.shutdown()
    // Persist any in-memory game states that are still active
    for (const [sessionId, state] of this.states) {
      try {
        if (state.phase !== GamePhase.GAME_OVER) {
          await this.prisma.gameSession.update({
            where: { id: sessionId },
            data: { phase: state.phase as never },
          })
        }
      } catch (err: unknown) {
        this.logger.error(`shutdown: failed to persist session ${sessionId}: ${String(err)}`)
      }
    }
    this.logger.log('GameOrchestrator shut down')
  }

  // ---------------------------------------------------------------------------
  // State management
  // ---------------------------------------------------------------------------

  getState(sessionId: string): EngineGameState | undefined {
    return this.states.get(sessionId)
  }

  private setState(state: EngineGameState): void {
    this.states.set(state.sessionId, state)
  }

  // ---------------------------------------------------------------------------
  // Start game — assign roles, transition to NIGHT, notify all clients
  // ---------------------------------------------------------------------------

  async startGame(
    roomCode: string,
    server: Server,
  ): Promise<void> {
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

    if (!room) {
      this.logger.warn(`startGame: room ${roomCode} not found`)
      return
    }

    const session = room.sessions[0]
    if (!session || session.players.length < 2) {
      this.logger.warn(`startGame: session not found or too few players in room ${roomCode}`)
      return
    }

    const settings = room.settings as unknown as RoomSettings
    const roleIds = this.buildRoleList(session.players.length)

    const baseState: EngineGameState = {
      sessionId: session.id,
      roomId: room.id,
      phase: GamePhase.LOBBY,
      players: session.players.map((ps: import('@prisma/client').PlayerSession & { user: { id: string; username: string } }) => ({
        id: ps.id,
        userId: ps.userId,
        username: ps.user.username,
        seat: ps.seat,
        isAlive: ps.isAlive,
        role: null,
      })),
      nightActionsTaken: {},
      votes: {},
      timerEndsAt: null,
      winner: null,
      pendingActions: [],
      detectiveResults: {},
      nightNumber: 1,
    }

    const stateWithRoles = assignRoles(baseState, roleIds)
    const nightState: EngineGameState = {
      ...stateWithRoles,
      phase: GamePhase.NIGHT,
      timerEndsAt: Date.now() + settings.nightDurationSeconds * 1000,
    }

    this.setState(nightState)

    await this.prisma.gameSession.update({
      where: { id: session.id },
      data: { phase: 'NIGHT' },
    })
    await this.appendEvent(session.id, 'GAME_STARTED', null, null, {
      roles: nightState.players.map((p) => ({ id: p.id, role: p.role })),
    })

    // Emit role_assigned to each player socket individually
    for (const player of nightState.players) {
      const filtered = filterStateForPlayer(nightState, player.id)
      server.to(player.userId).emit('role_assigned', { role: player.role })
      server.to(player.userId).emit('state_sync', filtered)
    }

    // Moderator gets full filtered view too
    server.to(`mod:${roomCode}`).emit('phase_change', {
      phase: GamePhase.NIGHT,
      timerEndsAt: nightState.timerEndsAt,
    })

    this.events.emit('game.phase_changed', {
      sessionId: session.id,
      phase: GamePhase.NIGHT,
      durationSeconds: settings.nightDurationSeconds,
      roomCode,
      server,
    })

    this.logger.log(`Game started in room ${roomCode}, session ${session.id}`)
  }

  // ---------------------------------------------------------------------------
  // Night action — single player acts, ack back with privateResult if any
  // ---------------------------------------------------------------------------

  async handleNightAction(
    sessionId: string,
    action: NightAction,
    client: Socket,
    server: Server,
  ): Promise<void> {
    const state = this.states.get(sessionId)
    if (!state) {
      client.emit('error', { code: 'NO_SESSION', message: 'Session not found' })
      return
    }

    let transition
    try {
      transition = processNightAction(state, action)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid action'
      client.emit('action_ack', { eventType: 'night_action', success: false, error: message })
      return
    }

    this.setState(transition.nextState)

    await this.appendEvent(sessionId, 'NIGHT_ACTION', action.actorId, action.targetId, {
      actionType: action.actionType,
    })

    const ack: Record<string, unknown> = { eventType: 'night_action', success: true }
    if (transition.privateResult !== undefined) {
      ack['result'] = transition.privateResult
    }
    client.emit('action_ack', ack)

    // Notify moderator that actor has submitted
    server.to(`mod:${sessionId}`).emit('player_updated', {
      playerId: action.actorId,
      nightActed: true,
    })
  }

  // ---------------------------------------------------------------------------
  // Cast vote (DAY_VOTING)
  // ---------------------------------------------------------------------------

  async handleVote(
    sessionId: string,
    voterId: string,
    targetId: string,
    client: Socket,
    server: Server,
  ): Promise<void> {
    const state = this.states.get(sessionId)
    if (!state) {
      client.emit('error', { code: 'NO_SESSION', message: 'Session not found' })
      return
    }

    if (state.phase !== GamePhase.DAY_VOTING) {
      client.emit('action_ack', { eventType: 'vote_cast', success: false, error: 'Not voting phase' })
      return
    }

    const voter = state.players.find((p) => p.id === voterId)
    if (!voter?.isAlive) {
      client.emit('action_ack', { eventType: 'vote_cast', success: false, error: 'Cannot vote' })
      return
    }

    if (state.votes[voterId]) {
      client.emit('action_ack', { eventType: 'vote_cast', success: false, error: 'Already voted' })
      return
    }

    const newState: EngineGameState = {
      ...state,
      votes: { ...state.votes, [voterId]: targetId },
    }
    this.setState(newState)

    await this.appendEvent(sessionId, 'VOTE_CAST', voterId, targetId, {})

    client.emit('action_ack', { eventType: 'vote_cast', success: true })

    const roomCode = await this.getRoomCode(sessionId)
    if (roomCode) {
      server.to(roomCode).emit('vote_update', { votes: newState.votes })
    }
  }

  // ---------------------------------------------------------------------------
  // End night — resolve actions, emit results, transition to DAY_DISCUSSION
  // ---------------------------------------------------------------------------

  async endNightPhase(sessionId: string, server: Server): Promise<void> {
    const state = this.states.get(sessionId)
    if (!state || state.phase !== GamePhase.NIGHT) return

    const { nextState, sideEffects } = resolveNightPhase(state)
    this.setState(nextState)

    const roomCode = await this.getRoomCode(sessionId)
    if (!roomCode) return

    const room = await this.prisma.room.findFirst({ where: { sessions: { some: { id: sessionId } } } })
    const settings = (room?.settings ?? {}) as unknown as RoomSettings

    let eliminatedPlayer: { targetId: string; actorId?: string; reason?: string } | null = null
    let gameOver = false

    for (const effect of sideEffects) {
      if (effect.type === 'PLAYER_ELIMINATED' || effect.type === 'PLAYER_SAVED') {
        const payload = effect.payload as { targetId: string; actorId?: string; reason?: string }
        await this.appendEvent(sessionId, effect.type, payload.actorId ?? null, payload.targetId, payload as Record<string, unknown>)

        if (effect.type === 'PLAYER_ELIMINATED') {
          eliminatedPlayer = payload
          if (settings.onSiteMode) {
            server.to(`mod:${roomCode}`).emit('elimination_update', payload)
          } else {
            server.to(roomCode).emit('elimination_update', payload)
          }
        }
      }

      if (effect.type === 'GAME_OVER') {
        gameOver = true
      }
    }

    if (gameOver) {
      await this.finalizeGame(sessionId, nextState.winner!, server, roomCode)
      return
    }

    // Last words before phase transition (skip in onSiteMode — moderator handles verbally)
    if (eliminatedPlayer && !settings.onSiteMode) {
      const eliminated = nextState.players.find((p) => p.id === eliminatedPlayer!.targetId)
      if (eliminated) {
        server.to(roomCode).emit('last_words_start', {
          playerId: eliminated.id,
          playerName: eliminated.username,
          seconds: 15,
        })
        await new Promise<void>((resolve) => {
          setTimeout(async () => {
            server.to(roomCode).emit('last_words_end', { playerId: eliminated.id })
            resolve()
          }, 15000)
        })
      }
    }

    await this.prisma.gameSession.update({ where: { id: sessionId }, data: { phase: 'DAY_DISCUSSION' } })
    await this.appendEvent(sessionId, 'PHASE_CHANGE', null, null, { phase: GamePhase.DAY_DISCUSSION })

    this.broadcastStateSync(nextState, roomCode, server)
    server.to(roomCode).emit('phase_change', {
      phase: GamePhase.DAY_DISCUSSION,
      timerEndsAt: nextState.timerEndsAt,
    })

    this.events.emit('game.phase_changed', {
      sessionId,
      phase: GamePhase.DAY_DISCUSSION,
      durationSeconds: settings.dayDiscussionDurationSeconds ?? 120,
      roomCode,
      server,
    })
  }

  // ---------------------------------------------------------------------------
  // End day — resolve votes, emit results, transition to NIGHT
  // ---------------------------------------------------------------------------

  async endDayPhase(sessionId: string, server: Server): Promise<void> {
    const state = this.states.get(sessionId)
    if (!state || state.phase !== GamePhase.DAY_VOTING) return

    const room = await this.prisma.room.findFirst({ where: { sessions: { some: { id: sessionId } } } })
    const settings = (room?.settings ?? {}) as unknown as RoomSettings

    const { nextState, sideEffects } = resolveDayVote(state, settings)
    this.setState(nextState)

    const roomCode = await this.getRoomCode(sessionId)
    if (!roomCode) return

    let dayEliminatedPlayer: { targetId: string; reason: string } | null = null
    let dayGameOver = false

    for (const effect of sideEffects) {
      if (effect.type === 'REVOTE_NEEDED') {
        server.to(roomCode).emit('phase_change', { phase: GamePhase.DAY_VOTING, timerEndsAt: null })
        server.to(roomCode).emit('vote_update', { votes: {} })
        return
      }

      if (effect.type === 'PLAYER_ELIMINATED') {
        const payload = effect.payload as { targetId: string; reason: string }
        await this.appendEvent(sessionId, 'PLAYER_ELIMINATED', null, payload.targetId, payload as Record<string, unknown>)
        dayEliminatedPlayer = payload
        if (settings.onSiteMode) {
          server.to(`mod:${roomCode}`).emit('elimination_update', payload)
        } else {
          server.to(roomCode).emit('elimination_update', payload)
        }
      }

      if (effect.type === 'GAME_OVER') {
        dayGameOver = true
      }
    }

    if (dayGameOver) {
      await this.finalizeGame(sessionId, nextState.winner!, server, roomCode)
      return
    }

    // Last words after day vote elimination (skip in onSiteMode)
    if (dayEliminatedPlayer && !settings.onSiteMode) {
      const eliminated = nextState.players.find((p) => p.id === dayEliminatedPlayer!.targetId)
      if (eliminated) {
        server.to(roomCode).emit('last_words_start', {
          playerId: eliminated.id,
          playerName: eliminated.username,
          seconds: 15,
        })
        await new Promise<void>((resolve) => {
          setTimeout(async () => {
            server.to(roomCode).emit('last_words_end', { playerId: eliminated.id })
            resolve()
          }, 15000)
        })
      }
    }

    await this.prisma.gameSession.update({ where: { id: sessionId }, data: { phase: 'NIGHT' } })
    await this.appendEvent(sessionId, 'PHASE_CHANGE', null, null, { phase: GamePhase.NIGHT })

    this.broadcastStateSync(nextState, roomCode, server)
    server.to(roomCode).emit('phase_change', { phase: GamePhase.NIGHT, timerEndsAt: nextState.timerEndsAt })

    this.events.emit('game.phase_changed', {
      sessionId,
      phase: GamePhase.NIGHT,
      durationSeconds: settings.nightDurationSeconds ?? 60,
      roomCode,
      server,
    })
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private broadcastStateSync(state: EngineGameState, roomCode: string, server: Server): void {
    for (const player of state.players) {
      const filtered = filterStateForPlayer(state, player.id)
      if (!player.isAlive) {
        // 5-second delay for spectators to prevent ghosting live info
        setTimeout(() => {
          server.to(player.userId).emit('state_sync', filtered)
        }, 5000)
      } else {
        server.to(player.userId).emit('state_sync', filtered)
      }
    }
    server.to(`mod:${roomCode}`).emit('state_sync', state)
  }

  private async finalizeGame(
    sessionId: string,
    winner: Team,
    server: Server,
    roomCode: string,
  ): Promise<void> {
    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: { phase: 'GAME_OVER', winner, endedAt: new Date() },
    })
    await this.appendEvent(sessionId, 'GAME_OVER', null, null, { winner })

    server.to(roomCode).emit('game_over', { winner })
    this.logger.log(`Game over in session ${sessionId} — winner: ${winner}`)
  }

  private async getRoomCode(sessionId: string): Promise<string | null> {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { room: { select: { code: true } } },
    })
    return session?.room.code ?? null
  }

  private async appendEvent(
    sessionId: string,
    type: string,
    actorId: string | null,
    targetId: string | null,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      const last = await this.prisma.gameEvent.findFirst({
        where: { sessionId },
        orderBy: { sequence: 'desc' },
        select: { sequence: true },
      })
      const sequence = (last?.sequence ?? 0) + 1
      await this.prisma.gameEvent.create({
        data: { sessionId, sequence, type, actorId, targetId, payload: payload as Prisma.InputJsonValue },
      })
    } catch (err: unknown) {
      this.logger.error(`Failed to append event ${type} for session ${sessionId}: ${String(err)}`)
    }
  }

  private buildRoleList(playerCount: number): string[] {
    const mafiaCount = Math.max(1, Math.floor(playerCount / 4))
    const roles: string[] = Array(mafiaCount).fill('mafia')
    if (playerCount >= 5) roles.push('detective')
    if (playerCount >= 6) roles.push('doctor')
    const villagerCount = playerCount - roles.length
    for (let i = 0; i < villagerCount; i++) roles.push('villager')
    return roles
  }
}
