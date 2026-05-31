import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type {
  ClientPlayerState,
  ClientGameState,
  PhaseChangePayload,
  TimerPayload,
  RolePayload,
  PlayerPayload,
  EliminationPayload,
  VotePayload,
  GameOverPayload,
  ErrorPayload,
  ChatMessagePayload,
  ChatHistoryPayload,
  ModeratorAnnouncePayload,
  LastWordsStartPayload,
  LastWordsEndPayload,
  SystemMessagePayload,
  GamePhase,
} from '@mafioso/types'
import { getSocket } from '../lib/socket'
import { getCachedToken } from '../lib/storage'
import { useUiStore } from './uiStore'

type ClientPlayer = ClientPlayerState

interface DetectiveResult {
  targetId: string
  result: string
}

interface LastWords {
  playerId: string
  playerName: string
  seconds: number
}

interface GameState {
  phase: GamePhase | null
  players: ClientPlayer[]
  myRole: string | null
  myId: string | null
  timer: number
  votes: VotePayload[]
  detectiveResults: DetectiveResult[]
  messages: ChatMessagePayload[]
  isSpectator: boolean
  winner: string | null
  error: string | null
  lastWords: LastWords | null
}

interface GameActions {
  handleSocketEvent(type: string, payload: unknown): void
  submitNightAction(targetId: string, actionType: string): void
  submitVote(targetId: string): void
  sendChatMessage(content: string): void
  reset(): void
}

const initialState: GameState = {
  phase: null,
  players: [],
  myRole: null,
  myId: null,
  timer: 0,
  votes: [],
  detectiveResults: [],
  messages: [],
  isSpectator: false,
  winner: null,
  error: null,
  lastWords: null,
}

function timerFromEndsAt(endsAt: number | null): number {
  if (!endsAt) return 0
  return Math.max(0, Math.floor((endsAt - Date.now()) / 1000))
}

function getUserIdFromCachedToken(): string | null {
  try {
    const token = getCachedToken()
    if (!token) return null
    const segment = token.split('.')[1]
    if (!segment) return null
    const padded = segment
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(segment.length + ((4 - (segment.length % 4)) % 4), '=')
    const json = JSON.parse(atob(padded)) as Record<string, unknown>
    return (json['sub'] as string) ?? null
  } catch {
    return null
  }
}

export const useGameStore = create<GameState & GameActions>()(
  immer((set) => ({
    ...initialState,

    handleSocketEvent(type: string, payload: unknown) {
      set((draft) => {
        switch (type) {
          case 'state_sync': {
            const s = payload as ClientGameState
            draft.phase = s.phase
            draft.players = s.players as ClientPlayer[]
            draft.timer = timerFromEndsAt(s.timerEndsAt)
            draft.votes = s.votes && Object.keys(s.votes).length > 0 ? [{ votes: s.votes }] : []
            draft.winner = s.winner
            if (s.isSpectator !== undefined) draft.isSpectator = s.isSpectator
            if (!draft.myId) {
              const userId = getUserIdFromCachedToken()
              if (userId) {
                const me = s.players.find((p) => p.userId === userId)
                if (me) draft.myId = me.id
              }
            }
            break
          }
          case 'phase_change': {
            const p = payload as PhaseChangePayload
            draft.phase = p.phase
            draft.timer = timerFromEndsAt(p.timerEndsAt)
            draft.votes = []
            break
          }
          case 'timer_tick': {
            const t = payload as TimerPayload
            draft.timer = timerFromEndsAt(t.timerEndsAt)
            break
          }
          case 'role_assigned': {
            const r = payload as RolePayload
            draft.myRole = r.role
            break
          }
          case 'player_updated': {
            const p = payload as PlayerPayload
            const idx = draft.players.findIndex((pl) => pl.id === p.playerId)
            if (idx !== -1) {
              draft.players[idx].isAlive = p.isAlive
            }
            break
          }
          case 'elimination_update': {
            const e = payload as EliminationPayload
            const idx = draft.players.findIndex((pl) => pl.id === e.playerId)
            if (idx !== -1) {
              draft.players[idx].isAlive = false
            }
            if (draft.myId && e.playerId === draft.myId) {
              draft.isSpectator = true
            }
            break
          }
          case 'vote_update': {
            draft.votes = [payload as VotePayload]
            break
          }
          case 'game_over': {
            const g = payload as GameOverPayload
            draft.phase = 'GAME_OVER' as GamePhase
            draft.winner = g.winner
            break
          }
          case 'new_message': {
            draft.messages.push(payload as ChatMessagePayload)
            break
          }
          case 'chat_history': {
            const h = payload as ChatHistoryPayload
            const existing = new Set(draft.messages.map((m) => m.id))
            for (const msg of h.messages) {
              if (!existing.has(msg.id)) {
                draft.messages.unshift(msg)
              }
            }
            draft.messages.sort((a, b) => a.timestamp - b.timestamp)
            break
          }
          case 'moderator_announce': {
            const a = payload as ModeratorAnnouncePayload
            useUiStore.getState().setAnnouncement(a.message)
            break
          }
          case 'last_words_start': {
            const lw = payload as LastWordsStartPayload
            draft.lastWords = { playerId: lw.playerId, playerName: lw.playerName, seconds: lw.seconds }
            break
          }
          case 'last_words_end': {
            void (payload as LastWordsEndPayload)
            draft.lastWords = null
            break
          }
          case 'system_message': {
            const s = payload as SystemMessagePayload
            useUiStore.getState().setAnnouncement(s.text)
            break
          }
          case 'error': {
            const e = payload as ErrorPayload
            draft.error = e.message
            break
          }
        }
      })
    },

    submitNightAction(targetId: string, actionType: string) {
      getSocket().emit('night_action', { targetId, actionType })
    },

    submitVote(targetId: string) {
      getSocket().emit('vote_cast', { targetId })
    },

    sendChatMessage(content: string) {
      getSocket().emit('send_message', { content })
    },

    reset() {
      set(() => ({ ...initialState }))
    },
  })),
)
