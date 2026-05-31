import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { Server } from 'socket.io'
import { GamePhase } from '@mafioso/types'
import { RedisService } from '../../redis/redis.service'
import { GameOrchestrator } from './game.orchestrator'

export interface PhaseChangedEvent {
  sessionId: string
  phase: GamePhase
  durationSeconds: number
  roomCode: string
  server: Server
}

interface ActiveTimer {
  interval: ReturnType<typeof setInterval>
  timeout: ReturnType<typeof setTimeout>
}

@Injectable()
export class TimerService implements OnModuleDestroy {
  private readonly logger = new Logger(TimerService.name)
  private readonly timers = new Map<string, ActiveTimer>()

  constructor(
    private readonly redis: RedisService,
    private readonly orchestrator: GameOrchestrator,
  ) {}

  @OnEvent('game.phase_changed')
  async onPhaseChanged(event: PhaseChangedEvent): Promise<void> {
    // Only auto-start timers for phases that expire automatically
    const timedPhases = [GamePhase.NIGHT, GamePhase.DAY_DISCUSSION, GamePhase.DAY_VOTING]
    if (!timedPhases.includes(event.phase)) return

    await this.startPhaseTimer(
      event.sessionId,
      event.phase,
      event.durationSeconds,
      event.roomCode,
      event.server,
    )
  }

  async startPhaseTimer(
    sessionId: string,
    phase: GamePhase,
    durationSeconds: number,
    roomCode: string,
    server: Server,
  ): Promise<number> {
    this.cancelTimer(sessionId)

    const endsAt = Date.now() + durationSeconds * 1000

    try {
      await this.redis
        .getClient()
        .set(`timer:${sessionId}:endsAt`, String(endsAt), 'EX', durationSeconds + 60)
      await this.redis
        .getClient()
        .set(`timer:${sessionId}:phase`, phase, 'EX', durationSeconds + 60)
    } catch {
      this.logger.warn(`Redis unavailable — timer for ${sessionId} is in-memory only`)
    }

    const interval = setInterval(() => {
      server.to(roomCode).emit('timer_tick', { timerEndsAt: endsAt, phase })
    }, 1000)

    const timeout = setTimeout(async () => {
      clearInterval(interval)
      this.timers.delete(sessionId)
      await this.onTimerExpired(sessionId, phase, server)
    }, durationSeconds * 1000)

    this.timers.set(sessionId, { interval, timeout })

    this.logger.log(`Timer started: session=${sessionId} phase=${phase} duration=${durationSeconds}s`)
    return endsAt
  }

  cancelTimer(sessionId: string): void {
    const existing = this.timers.get(sessionId)
    if (existing) {
      clearInterval(existing.interval)
      clearTimeout(existing.timeout)
      this.timers.delete(sessionId)
    }

    this.redis.getClient().del(`timer:${sessionId}:endsAt`).catch(() => undefined)
    this.redis.getClient().del(`timer:${sessionId}:phase`).catch(() => undefined)
  }

  async getTimerEndsAt(sessionId: string): Promise<number | null> {
    try {
      const val = await this.redis.getClient().get(`timer:${sessionId}:endsAt`)
      return val ? parseInt(val, 10) : null
    } catch {
      return null
    }
  }

  shutdown(): void {
    for (const [, timer] of this.timers) {
      clearInterval(timer.interval)
      clearTimeout(timer.timeout)
    }
    this.timers.clear()
    this.logger.log('TimerService shut down — all timers cleared')
  }

  onModuleDestroy(): void {
    this.shutdown()
  }

  private async onTimerExpired(sessionId: string, phase: GamePhase, server: Server): Promise<void> {
    this.logger.log(`Timer expired: session=${sessionId} phase=${phase}`)
    try {
      switch (phase) {
        case GamePhase.NIGHT:
          await this.orchestrator.endNightPhase(sessionId, server)
          break
        case GamePhase.DAY_VOTING:
          await this.orchestrator.endDayPhase(sessionId, server)
          break
        default:
          break
      }
    } catch (err: unknown) {
      this.logger.error(`Error on timer expiry ${sessionId}/${phase}: ${String(err)}`)
    }
  }
}
