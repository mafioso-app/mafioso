import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { WsException } from '@nestjs/websockets'
import { Socket } from 'socket.io'
import { GameOrchestrator } from '../../modules/game/game.orchestrator'

@Injectable()
export class SpectatorGuard implements CanActivate {
  constructor(private readonly orchestrator: GameOrchestrator) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>()
    const sessionId = client.data['sessionId'] as string | undefined
    const userId = client.data['userId'] as string | undefined

    if (!sessionId || !userId) {
      throw new WsException('Not in a game session')
    }

    const state = this.orchestrator.getState(sessionId)
    if (!state) {
      throw new WsException('Session not found')
    }

    const player = state.players.find((p) => p.userId === userId)
    if (!player || !player.isAlive) {
      throw new WsException('Spectators cannot perform actions')
    }

    return true
  }
}
