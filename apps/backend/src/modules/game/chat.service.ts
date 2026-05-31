import { Injectable } from '@nestjs/common'
import { GamePhase } from '@mafioso/types'
import type { ChatMessagePayload } from '@mafioso/types'
import { randomUUID } from 'crypto'

@Injectable()
export class ChatService {
  private readonly history = new Map<string, ChatMessagePayload[]>()

  getHistory(sessionId: string): ChatMessagePayload[] {
    return this.history.get(sessionId) ?? []
  }

  getLastMessages(sessionId: string, limit = 50): ChatMessagePayload[] {
    const messages = this.history.get(sessionId) ?? []
    return messages.slice(-limit)
  }

  sendMessage(
    sessionId: string,
    playerId: string,
    username: string,
    content: string,
    phase: GamePhase,
    isSpectator: boolean,
  ): ChatMessagePayload | null {
    // Only spectators and moderators may chat during NIGHT
    if (phase === GamePhase.NIGHT && !isSpectator) {
      return null
    }

    const trimmed = content.trim()
    if (!trimmed || trimmed.length > 500) return null

    const message: ChatMessagePayload = {
      id: randomUUID(),
      sessionId,
      playerId,
      username,
      content: trimmed,
      isSpectator,
      timestamp: Date.now(),
    }

    const list = this.history.get(sessionId) ?? []
    list.push(message)
    this.history.set(sessionId, list)

    return message
  }

  clearSession(sessionId: string): void {
    this.history.delete(sessionId)
  }
}
