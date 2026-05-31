import { ClientGameState, GameState } from './game-state.js'
import { JoinRoomDto, NightActionDto, VoteCastDto, ReconnectDto } from './dto.js'
import { GamePhase, Team } from './room.js'
import { RoleId } from './roles.js'

export interface PhaseChangePayload {
  phase: GamePhase
  timerEndsAt: number | null
}

export interface TimerPayload {
  timerEndsAt: number
  phase: GamePhase
}

export interface RolePayload {
  role: RoleId
  teammates: string[]
}

export interface PlayerPayload {
  playerId: string
  isAlive: boolean
  connected?: boolean
}

export interface EliminationPayload {
  playerId: string
  role: RoleId
}

export interface VotePayload {
  votes: Record<string, string>
}

export interface GameOverPayload {
  winner: Team
  roles: Record<string, RoleId>
}

export interface AckPayload {
  eventType: string
  success: boolean
}

export interface ChatMessagePayload {
  id: string
  sessionId: string
  playerId: string
  username: string
  content: string
  isSpectator: boolean
  timestamp: number
}

export interface ErrorPayload {
  code: string
  message: string
}

export interface SendMessageDto {
  content: string
}

export interface ModeratorAnnouncePayload {
  message: string
  timestamp: number
}

export interface LastWordsStartPayload {
  playerId: string
  playerName: string
  seconds: number
}

export interface LastWordsEndPayload {
  playerId: string
}

export interface SystemMessagePayload {
  text: string
}

export interface ClientToServerEvents {
  join_room: (payload: JoinRoomDto) => void
  night_action: (payload: NightActionDto) => void
  vote_cast: (payload: VoteCastDto) => void
  reconnect_state: (payload: ReconnectDto) => void
  send_message: (payload: SendMessageDto) => void
  moderator_announce: (payload: { message: string }) => void
}

export interface ChatHistoryPayload {
  messages: ChatMessagePayload[]
}

export interface ServerToClientEvents {
  state_sync: (state: ClientGameState) => void
  phase_change: (payload: PhaseChangePayload) => void
  timer_tick: (payload: TimerPayload) => void
  role_assigned: (payload: RolePayload) => void
  player_updated: (payload: PlayerPayload) => void
  elimination_update: (payload: EliminationPayload) => void
  vote_update: (payload: VotePayload) => void
  game_over: (payload: GameOverPayload) => void
  action_ack: (payload: AckPayload) => void
  new_message: (payload: ChatMessagePayload) => void
  chat_history: (payload: ChatHistoryPayload) => void
  moderator_announce: (payload: ModeratorAnnouncePayload) => void
  last_words_start: (payload: LastWordsStartPayload) => void
  last_words_end: (payload: LastWordsEndPayload) => void
  system_message: (payload: SystemMessagePayload) => void
  error: (payload: ErrorPayload) => void
}

export interface InterServerEvents {
  ping: () => void
}

export interface SocketData {
  userId: string
  sessionId: string
  roomId: string
}

export type { ClientGameState, GameState }
